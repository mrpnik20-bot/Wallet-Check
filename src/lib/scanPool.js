// Spreads key derivation across worker threads; falls back to the main thread
// when workers are unavailable.
import { deriveScanAddresses } from "./walletKeys";

const BATCH = 32;

function createWorkers() {
  if (typeof Worker === "undefined" || typeof navigator === "undefined") return null;
  const size = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  try {
    return Array.from(
      { length: size },
      () => new Worker(new URL("./scan.worker.js", import.meta.url), { type: "module" })
    );
  } catch {
    return null;
  }
}

async function deriveInline(phrases, record, state) {
  while (state.cursor < state.batches.length && !state.cancelled()) {
    const start = state.batches[state.cursor];
    state.cursor += 1;
    const slice = phrases.slice(start, start + BATCH);
    const list = [];
    for (const phrase of slice) {
      try {
        list.push(await deriveScanAddresses(phrase));
      } catch {
        list.push(null);
      }
    }
    record(start, list);
  }
}

export async function deriveAll(phrases, options = {}) {
  const total = phrases.length;
  const addresses = new Array(total);
  const batches = [];
  for (let start = 0; start < total; start += BATCH) batches.push(start);

  let done = 0;
  const record = (start, list) => {
    for (let i = 0; i < list.length; i += 1) addresses[start + i] = list[i];
    done += list.length;
    options.onProgress?.({ done, total });
  };

  const cancelled = () => !!options.isCancelled?.();
  const state = { batches, cursor: 0, cancelled };

  const workers = batches.length > 1 ? createWorkers() : null;
  if (!workers) {
    await deriveInline(phrases, record, state);
    return addresses;
  }

  try {
    await new Promise((resolve) => {
      let active = workers.length;
      let broken = false;

      const finishOne = () => {
        active -= 1;
        if (active === 0) resolve();
      };

      const next = (worker) => {
        if (broken || cancelled() || state.cursor >= state.batches.length) {
          finishOne();
          return;
        }
        const start = state.batches[state.cursor];
        state.cursor += 1;
        worker.postMessage({ id: start, phrases: phrases.slice(start, start + BATCH) });
      };

      for (const worker of workers) {
        worker.onmessage = (event) => {
          const start = Number(event.data?.id);
          if (Number.isFinite(start)) record(start, event.data?.addresses || []);
          next(worker);
        };
        worker.onerror = () => {
          broken = true;
          for (const item of workers) item.terminate();
          deriveInline(phrases, record, state).then(resolve);
        };
        next(worker);
      }
    });
  } finally {
    for (const worker of workers) worker.terminate();
  }

  return addresses;
}