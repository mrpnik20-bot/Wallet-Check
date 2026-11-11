// Parses a slice of a large file off the main thread so the UI keeps responding.
import { parsePhrases } from "./phraseParser";

self.onmessage = (event) => {
  const { id, text } = event.data || {};
  let phrases = [];
  try {
    phrases = parsePhrases(text);
  } catch {
    phrases = [];
  }
  self.postMessage({ id, phrases });
};