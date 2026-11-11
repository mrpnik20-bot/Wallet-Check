// Reads a big pasted/uploaded list in chunks on worker threads, so a multi-megabyte
// file never freezes the screen and valid recovery phrases show up progressively.
import { MAX_PHRASES, parsePhrases } from "./phraseParser";

const CHUNK_CHARS = 350000;

// Chunks always end on a line break, so a phrase is never split in two.
function splitChunks(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_CHARS, text.length);
    if (end < text.length) {
      const lineBreak = text.lastIndexOf("\n", end);
      if (lineBreak > start) end = lineBreak + 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

function createWorkers() {
  if (typeof Worker === "undefined" || typeof navigator === "undefined") return null;
  const size = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  try {
    return Array.from(
      { length: size },
      () => new Worker(new URL("./parse.worker.js", import.meta.url), { type: "module" })
    );
  } catch {
    return null;
  }
}

const SLICE_BYTES = 4 * 1024 * 1024;

// Reads a huge file slice by slice, so even a 500 MB list is parsed without
// loading it into memory in one go. A phrase is never split across slices.
export async function parseFilePhrases(file, onProgress) {
  const total = Math.max(1, Math.ceil(file.size / SLICE_BYTES));
  const seen = new Set();
  const phrases = [];
  let lines = 0;
  let carry = "";

  for (let index = 0; index < total; index += 1) {
    const slice = file.slice(index * SLICE_BYTES, (index + 1) * SLICE_BYTES);
    const text = carry + (await slice.text());
    let ready = text;
    let rest = "";
    if (index < total - 1) {
      const cut = text.lastIndexOf("\n");
      if (cut > 0) {
        ready = text.slice(0, cut);
        rest = text.slice(cut);
      }
    }
    carry = rest;
    lines += ready.split(/\r?\n/).filter((line) => line.trim()).length;

    const found = await parsePhrasesLarge(ready);
    for (const phrase of found) {
      if (seen.has(phrase)) continue;
      seen.add(phrase);
      phrases.push(phrase);
      // Only this many wallets are ever checked per run, so reading stops there
      // instead of filling memory with the rest of a very large file.
      if (phrases.length >= MAX_PHRASES) break;
    }
    onProgress?.({ done: index + 1, total, count: phrases.length });
    if (phrases.length >= MAX_PHRASES) break;
  }

  return { phrases, lines };
}

export async function parsePhrasesLarge(text, onProgress) {
  const source = String(text || "");
  const chunks = splitChunks(source);
  const seen = new Set();
  const phrases = [];
  let done = 0;

  const collect = (found) => {
    for (const phrase of found || []) {
      if (seen.has(phrase)) continue;
      seen.add(phrase);
      phrases.push(phrase);
    }
    done += 1;
    onProgress?.({ done, total: chunks.length, count: phrases.length });
  };

  const workers = chunks.length > 1 ? createWorkers() : null;
  if (!workers) {
    for (const chunk of chunks) collect(parsePhrases(chunk));
    return phrases;
  }

  try {
    await new Promise((resolve) => {
      let cursor = 0;
      let active = workers.length;
      let broken = false;

      const finish = () => {
        active -= 1;
        if (active === 0) resolve();
      };

      const next = (worker) => {
        if (broken || cursor >= chunks.length) {
          finish();
          return;
        }
        const index = cursor;
        cursor += 1;
        worker.postMessage({ id: index, text: chunks[index] });
      };

      for (const worker of workers) {
        worker.onmessage = (event) => {
          collect(event.data?.phrases || []);
          next(worker);
        };
        worker.onerror = () => {
          broken = true;
          for (const item of workers) item.terminate();
          for (const chunk of chunks) collect(parsePhrases(chunk));
          resolve();
        };
        next(worker);
      }
    });
  } finally {
    for (const worker of workers) worker.terminate();
  }

  return phrases;
}