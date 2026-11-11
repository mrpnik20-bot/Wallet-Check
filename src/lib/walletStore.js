import { useCallback, useEffect, useState } from "react";
import { CHAINS, getChain } from "./chains";
import { fetchChainBalances } from "./server-fns";
import { deriveAddresses } from "./walletKeys";
import { useWallet } from "./WalletContext";

// Watch-only addresses live on this device, like the encrypted phrase — no account needed.
const WATCH_KEY = "meridian.watch.addresses";

const readWatch = () => {
  try {
    const raw = window.localStorage.getItem(WATCH_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeWatch = (map) => {
  try {
    window.localStorage.setItem(WATCH_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable — the address simply won't persist
  }
};

// Watch-only chains (no signing support yet) keep a manually entered address.
export async function saveAddress(chainId, address) {
  const chain = getChain(chainId);
  if (!chain) throw new Error("unknown chain");
  writeWatch({ ...readWatch(), [chainId]: address });
  return { chain_id: chainId, symbol: chain.symbol, address };
}

export async function resetWalletData() {
  try {
    window.localStorage.removeItem(WATCH_KEY);
  } catch {
    // nothing stored
  }
}

export function useAccounts() {
  const { unlocked, phrase } = useWallet();
  const [state, setState] = useState({ loading: true, accounts: [] });

  const load = useCallback(async () => {
    if (!unlocked || !phrase) {
      setState({ loading: false, accounts: [] });
      return;
    }

    let derived = {};
    try {
      derived = await deriveAddresses(phrase);
    } catch {
      derived = {};
    }

    const watch = readWatch();

    const connected = CHAINS.map((chain) => ({
      chain_id: chain.id,
      address: derived[chain.id] || watch[chain.id] || "",
      derived: Boolean(derived[chain.id]),
    })).filter((row) => row.address);

    let balances = {};
    let prices = {};
    let errors = {};
    if (connected.length > 0) {
      try {
        const result = await fetchChainBalances({
          data: { assets: connected.map(({ chain_id, address }) => ({ chain_id, address })) },
        });
        balances = result.balances || {};
        prices = result.prices || {};
        errors = result.errors || {};
      } catch (error) {
        errors = Object.fromEntries(connected.map((row) => [row.chain_id, "Couldn't read balance"]));
      }
    }

    const accounts = CHAINS.map((chain) => {
      const entry = connected.find((row) => row.chain_id === chain.id);
      const price = prices[chain.id];
      return {
        id: null,
        chain_id: chain.id,
        symbol: chain.symbol,
        address: entry?.address || "",
        derived: Boolean(entry?.derived),
        amount: balances[chain.id] ?? null,
        price_usd: price?.usd ?? null,
        change_24h: price?.change ?? 0,
        error: errors[chain.id] || null,
      };
    });

    setState({ loading: false, accounts });
  }, [unlocked, phrase]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}