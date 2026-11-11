// Device-local vault: seed phrases never leave the browser. The saved wallet list is
// encrypted with the 4-digit PIN (PBKDF2 → AES-GCM) and kept in localStorage.
const VAULT_KEY = "meridian.vault.v1";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
  const array = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < array.length; i += 1) binary += String.fromCharCode(array[i]);
  return btoa(binary);
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function deriveKey(pin, salt) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 180000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function hasVault() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(VAULT_KEY));
}

export function forgetVault() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(VAULT_KEY);
}

// Keep the previous entry aside before it gets replaced, so a different PIN can't wipe saved wallets.
export function stashVault() {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(VAULT_KEY);
  if (raw) window.localStorage.setItem(`${VAULT_KEY}.previous`, raw);
}

// Returns every phrase saved on this device, or null when the PIN doesn't open the vault.
export async function readVault(pin) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(VAULT_KEY);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    const key = await deriveKey(pin, fromBase64(payload.salt));
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(payload.iv) },
      key,
      fromBase64(payload.data)
    );
    const text = decoder.decode(plain);
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item) : [text];
    } catch {
      return [text];
    }
  } catch {
    return null;
  }
}

export async function writeVault(phrases, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(phrases))
  );
  window.localStorage.setItem(
    VAULT_KEY,
    JSON.stringify({ v: 2, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(encrypted) })
  );
}