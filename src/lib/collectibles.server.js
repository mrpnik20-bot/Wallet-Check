// NFT and jetton lookups for the bulk scanner. Only public addresses leave the
// device; every lookup is best-effort so a single refusal never fails a scan.
// Public instances that answer without an API key.
const BLOCKSCOUT = {
  ethereum: "https://eth.blockscout.com",
  optimism: "https://optimism.blockscout.com",
};

async function getJson(url, timeout = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(items, limit, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) await worker(item);
    })
  );
}

const trim = (value, max = 60) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

// ERC-721 and ERC-1155 items held by one EVM address.
async function evmNfts(base, address) {
  const data = await getJson(`${base}/api/v2/addresses/${address}/nft?type=ERC-721,ERC-1155`);
  return (data.items || [])
    .slice(0, 12)
    .map((item) => {
      const token = item.token || {};
      const name = item.metadata?.name || `${token.name || "NFT"} #${item.id}`;
      return {
        name: trim(name),
        collection: trim([token.name, token.symbol].filter(Boolean).join(" · "), 40),
        link: `${base}/token/${token.address}/instance/${item.id}`,
        gift: false,
      };
    })
    .filter((item) => item.name);
}

// TON items — this is where Telegram gifts live, so they are flagged by name.
async function tonNfts(account) {
  const data = await getJson(
    `https://tonapi.io/v2/accounts/${encodeURIComponent(account)}/nfts?limit=50&indirect_ownership=false`
  );
  return (data.nft_items || [])
    .slice(0, 20)
    .map((item) => {
      const name = trim(item.metadata?.name || "NFT");
      const collection = trim(item.collection?.name, 40);
      return {
        name,
        collection,
        link: `https://tonviewer.com/${item.address}`,
        gift: /gift|present/i.test(`${name} ${collection}`),
      };
    })
    .filter((item) => item.name);
}

async function tonJettons(account) {
  const data = await getJson(`https://tonapi.io/v2/accounts/${encodeURIComponent(account)}/jettons`);
  return (data.balances || [])
    .map((row) => {
      const jetton = row.jetton || {};
      if (!jetton.symbol || jetton.decimals === undefined) return null;
      if (jetton.verification === "blacklist" || jetton.verification === "none") return null;
      const amount = Number(row.balance) / 10 ** Number(jetton.decimals);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      return { symbol: trim(jetton.symbol, 12), amount };
    })
    .filter(Boolean)
    .slice(0, 10);
}

export async function readCollectibles(assets) {
  const nfts = {};
  const tokens = {};
  const groups = new Map();
  for (const asset of assets) {
    if (!groups.has(asset.chain_id)) groups.set(asset.chain_id, []);
    groups.get(asset.chain_id).push(asset);
  }

  await Promise.all(
    Array.from(groups.entries()).map(async ([chainId, list]) => {
      const base = BLOCKSCOUT[chainId];
      if (!base && chainId !== "ton") return;
      await runPool(list, chainId === "ton" ? 3 : 6, async (asset) => {
        try {
          if (base) {
            const found = await evmNfts(base, asset.address);
            if (found.length) nfts[asset.key] = found;
            return;
          }
          const [found, jettons] = await Promise.all([tonNfts(asset.address), tonJettons(asset.address)]);
          if (found.length) nfts[asset.key] = found;
          if (jettons.length) tokens[asset.key] = jettons;
        } catch {
          // that chain refused the lookup — no collectibles for this wallet
        }
      });
    })
  );

  return { nfts, tokens };
}