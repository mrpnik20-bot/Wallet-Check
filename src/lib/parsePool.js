// Reads a big pasted/uploaded list in chunks on worker threads, so a multi-megabyte
// file never freezes the screen and valid recovery phrases show up progressively.
import { parsePhrases } from "./phraseParser";

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