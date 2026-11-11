// Bulk wallet check: every phrase is derived locally, only public addresses leave the device.
import { getChain } from "./chains";
import { getChainPrices, scanWalletBalances } from "./server-fns";
import { deriveAll } from "./scanPool";
import { MAX_PHRASES, parsePhrases } from "./phraseParser";

export { MAX_PHRASES, parsePhrases };

export const SCAN_CHAIN_IDS = [
  "bitcoin",
  "ethereum",
  "bnb",
  "polygon",
  "base",
  "arbitrum",
  "avalanche",
  "solana",
  "ton",
  "tron",
  "litecoin",
  "dogecoin",
  "ripple",
];

const DEFAULT_CHUNK = 800;
const TON_CHUNK = 40;
const PARALLEL_CHUNKS = 5;
const DUST_USD = 0.01;

// One chunk per chain keeps each balance request batched on a single network.
function buildChunks(assets) {
  const byChain = new Map();
  for (const asset of assets) {
    if (!byChain.has(asset.chain_id)) byChain.set(asset.chain_id, []);
    byChain.get(asset.chain_id).push(asset);
  }

  const chunks = [];
  for (const [chainId, list] of byChain) {
    const size = chainId === "ton" ? TON_CHUNK : DEFAULT_CHUNK;
    for (let start = 0; start < list.length; start += size) {
      chunks.push(list.slice(start, start + size));
    }
  }
  return chunks;
}

export async function scanPhrases(phrases, onProgress, options = {}) {
  const cancelled = () => !!options.isCancelled?.();
  const list = phrases.slice(0, MAX_PHRASES);

  const addresses = await deriveAll(list, {
    onProgress: ({ done, total }) => onProgress?.({ stage: "derive", done, total }),
    isCancelled: cancelled,
  });
  if (cancelled()) return [];

  const prices = await getChainPrices().catch(() => ({}));

  const wallets = [];
  const assets = [];
  const seen = new Set();
  list.forEach((phrase, index) => {
    const derived = addresses[index] || {};
    wallets.push({ index: index + 1, addresses: derived });
    for (const chainId of SCAN_CHAIN_IDS) {
      const address = derived[chainId];
      if (!address) continue;
      const key = `${chainId}|${address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      assets.push({ key, chain_id: chainId, address });
    }
  });

  const balances = {};
  const resolved = {};
  const chunks = buildChunks(assets);
  let checked = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < chunks.length && !cancelled()) {
      const chunk = chunks[cursor];
      cursor += 1;
      try {
        const result = await scanWalletBalances({ data: { assets: chunk } });
        Object.assign(balances, result.balances || {});
        Object.assign(resolved, result.resolved || {});
      } catch {
        // chunk failed — those wallets simply show no balance
      }
      checked += chunk.length;
      onProgress?.({ stage: "check", done: checked, total: assets.length });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PARALLEL_CHUNKS, chunks.length) }, () => worker())
  );

  const results = wallets.map((wallet) => {
    const holdings = SCAN_CHAIN_IDS.map((chainId) => {
      const address = wallet.addresses[chainId];
      if (!address) return null;
      const key = `${chainId}|${address}`;
      const amount = balances[key];
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const chain = getChain(chainId);
      const usd = prices[chainId]?.usd ? amount * prices[chainId].usd : null;
      if (usd !== null ? usd < DUST_USD : amount < 0.0001) return null;
      const shown = resolved[key] || address;
      return {
        chainId,
        symbol: chain.symbol,
        name: chain.name,
        amount,
        usd,
        address: shown,
        link: chainId === "ton" ? `${chain.explorer}${encodeURIComponent(shown)}` : `${chain.explorer}${shown}`,
      };
    }).filter(Boolean);
    const total = holdings.reduce((sum, item) => sum + (item.usd || 0), 0);
    return { ...wallet, holdings, total };
  });

  results.sort((a, b) => b.total - a.total || b.holdings.length - a.holdings.length);
  return results;
}