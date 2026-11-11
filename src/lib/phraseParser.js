// Extracts every real BIP39 recovery phrase from any pasted text or file content:
// plain lines, numbered lists, CSV, JSON, quotes and tables all work, because
// punctuation and digits are stripped and only word sequences are matched.
// Each line (or ; | tab separated entry) is matched on its own so two neighbouring
// phrases can never be merged into one.
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

const WORDS = new Set(wordlist);
const LENGTHS = [24, 21, 18, 15, 12];
const SPLIT = /\r?\n|;|\||\t/;

export const MAX_PHRASES = 100000;

const wordsOf = (line) => line.toLowerCase().split(/[^a-z]+/).filter(Boolean);
const isValid = (tokens) => validateMnemonic(tokens.join(" "), wordlist);

export function parsePhrases(text) {
  const phrases = [];
  const seen = new Set();
  const push = (tokens) => {
    const phrase = tokens.join(" ");
    if (seen.has(phrase)) return;
    seen.add(phrase);
    phrases.push(phrase);
  };

  for (const line of String(text || "").split(SPLIT)) {
    const tokens = wordsOf(line);
    if (tokens.length < 12) continue;

    // Fast path: one phrase, or a run of 12-word phrases, filling the line exactly.
    if (tokens.length % 12 === 0 && tokens.length <= 480) {
      let clean = true;
      for (let start = 0; start < tokens.length; start += 12) {
        if (!isValid(tokens.slice(start, start + 12))) {
          clean = false;
          break;
        }
      }
      if (clean) {
        for (let start = 0; start < tokens.length; start += 12) push(tokens.slice(start, start + 12));
        continue;
      }
    }

    // Otherwise slide a window over the line, taking the longest valid phrase.
    let index = 0;
    while (index < tokens.length) {
      let matched = 0;
      for (const length of LENGTHS) {
        if (index + length > tokens.length) continue;
        let allWords = true;
        for (let offset = 0; offset < length; offset += 1) {
          if (!WORDS.has(tokens[index + offset])) {
            allWords = false;
            break;
          }
        }
        if (!allWords) continue;
        const slice = tokens.slice(index, index + length);
        if (!isValid(slice)) continue;
        matched = length;
        push(slice);
        break;
      }
      index += matched || 1;
    }
  }

  return phrases;
}