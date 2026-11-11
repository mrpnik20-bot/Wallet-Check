// Bulk wallet check: every phrase is derived locally, only public addresses leave the device.
import { getChain } from "./chains";
import { getChainPrices, getTokenPrices, scanCollectibles, scanWalletBalances } from "./server-fns";
import { deriveAll } from "./scanPool";
import { MAX_PHRASES, parsePhrases } from "./phraseParser";

export { MAX_PHRASES, parsePhrases };

// Every network a phrase is checked on, plus the tokens, NFTs and TON gifts.
export const SCAN_CHAIN_IDS = [
  "bitcoin",
  "ethereum",
  "bnb",
  "polygon",
  "base",
  "arbitrum",
  "optimism",
  "zksync",
  "linea",
  "scroll",
  "blast",
  "gnosis",
  "celo",
  "mantle",
  "avalanche",
  "solana",
  "ton",
  "tron",
  "litecoin",
  "dogecoin",
  "ripple",
];

// Networks whose NFT collections are read for funded wallets.
const NFT_CHAIN_IDS = ["ton", "ethereum", "optimism"];
const MAX_NFT_WALLETS = 200;

const DEFAULT_CHUNK = 800;
const TON_CHUNK = 40;
const PARALLEL_CHUNKS = 5;
const COLLECT_CHUNK = 40;

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

function linkFor(chainId, address) {
  const chain = getChain(chainId);
  if (!chain) return "";
  return chainId === "ton" ? `${chain.explorer}${encodeURIComponent(address)}` : `${chain.explorer}${address}`;
}

// Every coin, token and collectible one wallet turned out to hold.
function holdingsFor(wallet, { balances, tokens, resolved, prices, tokenPrices }) {
  const list = [];
  for (const chainId of SCAN_CHAIN_IDS) {
    const address = wallet.addresses[chainId];
    if (!address) continue;
    const key = `${chainId}|${address}`;
    const shown = resolved[key] || address;
    const chain = getChain(chainId);

    const amount = balances[key];
    if (Number.isFinite(amount) && amount > 0) {
      const usd = prices[chainId]?.usd ? amount * prices[chainId].usd : null;
      list.push({
        kind: "coin",
        chainId,
        symbol: chain.symbol,
        name: chain.name,
        amount,
        usd,
        address: shown,
        link: linkFor(chainId, shown),
      });
    }

    for (const token of tokens[key] || []) {
      if (token.kind === "nft") {
        list.push({
          kind: "nft",
          chainId,
          symbol: "NFT",
          name: token.name || "NFT",
          amount: null,
          usd: null,
          address: shown,
          link: token.link || linkFor(chainId, shown),
        });
        continue;
      }
      if (!(token.amount > 0)) continue;
      const rate = token.contract ? tokenPrices[`${chainId}|${token.contract.toLowerCase()}`] : null;
      const usd = rate ? token.amount * rate : null;
      list.push({
        kind: "token",
        chainId,
        symbol: token.symbol,
        name: token.symbol,
        amount: token.amount,
        usd,
        address: shown,
        link: linkFor(chainId, shown),
      });
    }
  }
  return list;
}

// NFTs, TON gifts and jettons, read only for wallets that already hold something.
async function addCollectibles(rows, resolved, onProgress, cancelled) {
  const targets = rows.filter((row) => row.holdings.length > 0).slice(0, MAX_NFT_WALLETS);
  const queue = [];
  for (const row of targets) {
    for (const chainId of NFT_CHAIN_IDS) {
      const address = row.addresses[chainId];
      if (!address) continue;
      queue.push({
        key: `${row.index}|${chainId}`,
        chain_id: chainId,
        address: resolved[`${chainId}|${address}`] || address,
      });
    }
  }
  if (queue.length === 0) return rows;

  const found = { nfts: {}, tokens: {} };
  let done = 0;
  for (let start = 0; start < queue.length; start += COLLECT_CHUNK) {
    if (cancelled()) break;
    const chunk = queue.slice(start, start + COLLECT_CHUNK);
    try {
      const result = await scanCollectibles({ data: { assets: chunk } });
      Object.assign(found.nfts, result.nfts || {});
      Object.assign(found.tokens, result.tokens || {});
    } catch {
      // this batch failed — those wallets keep their coin balances only
    }
    done += chunk.length;
    onProgress?.({ stage: "collect", done, total: queue.length });
  }

  const byIndex = new Map(rows.map((row) => [row.index, row]));
  const push = (key, holding) => {
    const [index, chainId] = key.split("|");
    const wallet = byIndex.get(Number(index));
    if (!wallet) return;
    const address = wallet.addresses[chainId];
    wallet.holdings.push({ ...holding, chainId, address, link: holding.link || linkFor(chainId, address) });
  };

  for (const [key, items] of Object.entries(found.nfts)) {
    for (const item of items) {
      push(key, {
        kind: "nft",
        symbol: item.gift ? "Gift" : "NFT",
        name: item.name,
        amount: null,
        usd: null,
        link: item.link,
      });
    }
  }
  for (const [key, items] of Object.entries(found.tokens)) {
    for (const item of items) {
      push(key, { kind: "token", symbol: item.symbol, name: item.symbol, amount: item.amount, usd: null });
    }
  }

  return rows;
}

// USD value for every coin the check turned up, in one price request.
async function readTokenPrices(tokens) {
  const pairs = [];
  const seen = new Set();
  for (const [key, list] of Object.entries(tokens)) {
    const chainId = key.split("|")[0];
    for (const token of list) {
      if (!token.contract) continue;
      const id = `${chainId}|${token.contract.toLowerCase()}`;
      if (seen.has(id)) continue;
      seen.add(id);
      pairs.push({ chain_id: chainId, contract: token.contract });
    }
  }
  if (pairs.length === 0) return {};
  try {
    return await getTokenPrices({ data: { tokens: pairs.slice(0, 200) } });
  } catch {
    return {};
  }
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
  const tokens = {};
  const resolved = {};
  const chunks = buildChunks(assets);
  let checked = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < chunks.length && !cancelled()) {
      const chunk = chunks[cursor];
      cursor += 1;
      try {
        const result = await scanWalletBalances({
          data: { assets: chunk, tokens: !!options.collectibles },
        });
        Object.assign(balances, result.balances || {});
        Object.assign(tokens, result.tokens || {});
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

  const tokenPrices = await readTokenPrices(tokens);

  let results = wallets.map((wallet) => {
    const holdings = holdingsFor(wallet, { balances, tokens, resolved, prices, tokenPrices });
    const total = holdings.reduce((sum, item) => sum + (item.usd || 0), 0);
    return { ...wallet, holdings, total };
  });

  if (options.collectibles && !cancelled()) {
    results = await addCollectibles(results, resolved, onProgress, cancelled);
    for (const row of results) {
      row.total = row.holdings.reduce((sum, item) => sum + (item.usd || 0), 0);
    }
  }

  results.sort((a, b) => b.total - a.total || b.holdings.length - a.holdings.length);
  return results;
}