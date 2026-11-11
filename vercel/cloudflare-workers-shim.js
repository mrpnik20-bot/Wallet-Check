// Vercel stand-in for the Cloudflare "cloudflare:workers" module: the error reporter
// only reads environment variables and defers a post-response promise.
export const env = process.env;

export function waitUntil(promise) {
  if (promise && typeof promise.catch === "function") promise.catch(() => {});
}