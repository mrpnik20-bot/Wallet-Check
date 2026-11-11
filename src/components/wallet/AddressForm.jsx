import { useState } from "react";
import { toast } from "sonner";
import { isValidAddress } from "@/lib/chains";
import { saveAddress } from "@/lib/walletStore";

export default function AddressForm({ account, label, onSaved }) {
  const [value, setValue] = useState(account.address || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const clean = value.trim();
    if (!isValidAddress(account.chain_id, clean)) {
      setError("That address doesn't look right — check it again.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await saveAddress(account.chain_id, clean);
      toast.success("Address saved");
      await onSaved?.();
    } catch (err) {
      setError("Couldn't save it. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {label && <p className="label-xs">{label}</p>}
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError("");
          }}
          spellCheck={false}
          autoComplete="off"
          placeholder={`${account.symbol} public address`}
          className="num min-w-0 flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-[13px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/20"
        />
        <button
          type="button"
          onClick={submit}
          disabled={saving || value.trim().length < 6}
          className="shrink-0 rounded-2xl bg-[#3B82F6] px-5 py-3 text-[13px] font-semibold text-white transition-all enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-[11.5px] text-rose-300/85">{error}</p>}
    </div>
  );
}