import { useState } from "react";
import { isValidPhrase, normalizePhrase, wordCount } from "@/lib/seedWords";
import { useWallet } from "@/lib/WalletContext";
import { SCAN_CHAIN_IDS } from "@/lib/walletScan";
import BulkScanner from "./BulkScanner";
import PinInput from "./PinInput";

export default function LoginScreen() {
  const { create } = useWallet();
  const [phrase, setPhrase] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const count = wordCount(phrase);
  const canSubmit = count >= 12 && pin.length === 4 && !busy;

  const submit = async (event) => {
    event.preventDefault();
    if (!isValidPhrase(phrase)) {
      setError("Enter at least 12 words, separated by spaces.");
      return;
    }
    if (pin.length !== 4) {
      setError("Enter your 4-digit PIN.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await create(normalizePhrase(phrase), pin);
    } catch (err) {
      setBusy(false);
      setError("Couldn't open the wallet. Check your connection and try again.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col justify-start px-5 pb-16 pt-10">
      <form onSubmit={submit} className="animate-rise">
        <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-gradient-to-br from-[#3B82F6] to-[#6366F1] text-[23px] font-extrabold text-white shadow-[0_18px_44px_-18px_rgba(59,130,246,0.85)]">
          M
        </span>
        <h1 className="mt-6 font-display text-[32px] leading-tight text-white">Log in to your wallet</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-white/40">
          Enter your seed phrase and your 4-digit PIN. The phrase is encrypted on this device and never leaves it.
        </p>

        <p className="label-xs mt-8">Seed phrase</p>
        <textarea
          value={phrase}
          onChange={(event) => {
            setPhrase(event.target.value);
            setError("");
          }}
          rows={4}
          spellCheck={false}
          autoComplete="off"
          placeholder="word one two three …"
          className="mt-2.5 w-full resize-none rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 text-[14px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/20"
        />
        <p className="mt-2 text-[11.5px] text-white/30">{count} words</p>

        <p className="label-xs mt-6">4-digit PIN</p>
        <div className="mt-3">
          <PinInput
            value={pin}
            onChange={(value) => {
              setPin(value);
              setError("");
            }}
            disabled={busy}
          />
        </div>

        {error && <p className="mt-4 text-[11.5px] text-rose-300/85">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 w-full rounded-2xl bg-[#3B82F6] py-3.5 text-[14px] font-semibold text-white transition-all enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy ? "Opening…" : "Open wallet"}
        </button>
      </form>

      <section className="animate-rise mt-12 border-t border-white/[0.07] pt-8">
        <p className="label-xs">Bulk wallet checker</p>
        <h2 className="mt-2 font-heading text-[20px] font-semibold leading-tight text-white">
          Check many wallets at once
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/40">
          No login needed. Upload a .txt with one recovery phrase per line — every wallet is derived on this device
          and its real balances are read across {SCAN_CHAIN_IDS.length} chains.
        </p>
        <div className="mt-4">
          <BulkScanner />
        </div>
      </section>
    </div>
  );
}