import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CHAINS, getChain } from "./chains";
import { fetchChainBalances } from "./server-fns";
import { deriveAddresses } from "./walletKeys";
import { useWallet } from "./WalletContext";

const loadRows = () => base44.entities.WalletAccount.list("-created_date", 50);

// Watch-only chains (no signing support yet) keep a manually entered address.
export async function saveAddress(chainId, address) {
  const chain = getChain(chainId);
  if (!chain) throw new Error("unknown chain");
  const rows = await loadRows();
  const existing = rows.find((row) => row.chain_id === chainId);
  if (existing) {
    return base44.entities.WalletAccount.update(existing.id, { address, symbol: chain.symbol });
  }
  return base44.entities.WalletAccount.create({ chain_id: chainId, symbol: chain.symbol, address });
}

export async function resetWalletData() {
  const rows = await loadRows();
  await Promise.all(rows.map((record) => base44.entities.WalletAccount.delete(record.id)));
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

    const rows = await loadRows();
    const watch = new Map(rows.filter((row) => row.address).map((row) => [row.chain_id, row]));

    const connected = CHAINS.map((chain) => ({
      chain_id: chain.id,
      address: derived[chain.id] || watch.get(chain.id)?.address || "",
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
        id: watch.get(chain.id)?.id || null,
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