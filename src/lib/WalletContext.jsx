import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { forgetVault, hasVault, readVault, stashVault, writeVault } from "./vault";

const WalletContext = createContext(null);

const normalize = (phrase) =>
  String(phrase || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export function WalletProvider({ children }) {
  const [state, setState] = useState({ ready: false, hasVault: false, phrase: null, phrases: [], pin: null });

  useEffect(() => {
    setState((current) => ({ ...current, ready: true, hasVault: hasVault() }));
  }, []);

  // Logging in adds the phrase to the saved wallet list on this device.
  const create = useCallback(async (phrase, pin) => {
    const clean = normalize(phrase);
    const existing = await readVault(pin).catch(() => null);
    if (!existing && hasVault()) stashVault();
    const list = [clean, ...(existing || []).filter((item) => item !== clean)];
    await writeVault(list, pin);
    setState({ ready: true, hasVault: true, phrase: clean, phrases: list, pin });
  }, []);

  const unlock = useCallback(async (pin) => {
    const list = await readVault(pin);
    if (!list || list.length === 0) return false;
    setState({ ready: true, hasVault: true, phrase: list[0], phrases: list, pin });
    return true;
  }, []);

  const addPhrases = useCallback(
    async (extra) => {
      if (!state.pin) return state.phrases;
      const merged = [...new Set([...state.phrases, ...extra.map(normalize).filter(Boolean)])];
      if (merged.length === state.phrases.length) return merged;
      try {
        await writeVault(merged, state.pin);
      } catch {
        // device storage is full — the list is still checked now and kept for this session
      }
      setState((current) => ({ ...current, hasVault: true, phrases: merged }));
      return merged;
    },
    [state.pin, state.phrases]
  );

  // After a bulk check only the wallets that hold funds stay saved. The wallet
  // this device is signed in with is always kept, so the app never locks itself out.
  const retainPhrases = useCallback(
    async (keep) => {
      if (!state.pin) return state.phrases;
      const wanted = new Set([...(keep || []), ...(state.phrase ? [state.phrase] : [])].map(normalize));
      const next = state.phrases.filter((item) => wanted.has(item));
      if (next.length === 0 || next.length === state.phrases.length) return state.phrases;
      try {
        await writeVault(next, state.pin);
      } catch {
        // device storage refused the write — the list stays as it is
      }
      setState((current) => ({ ...current, phrases: next }));
      return next;
    },
    [state.pin, state.phrase, state.phrases]
  );

  const lock = useCallback(() => {
    setState((current) => ({ ...current, phrase: null, phrases: [], pin: null }));
  }, []);

  const verifyPin = useCallback(async (pin) => Boolean(await readVault(pin)), []);

  const changePin = useCallback(
    async (pin) => {
      if (state.phrases.length === 0) return false;
      await writeVault(state.phrases, pin);
      setState((current) => ({ ...current, pin }));
      return true;
    },
    [state.phrases]
  );

  const forget = useCallback(() => {
    forgetVault();
    setState({ ready: true, hasVault: false, phrase: null, phrases: [], pin: null });
  }, []);

  const value = {
    ready: state.ready,
    hasVault: state.hasVault,
    unlocked: Boolean(state.phrase),
    phrase: state.phrase,
    phrases: state.phrases,
    create,
    unlock,
    addPhrases,
    retainPhrases,
    lock,
    verifyPin,
    changePin,
    forget,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
}