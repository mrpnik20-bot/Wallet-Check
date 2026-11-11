import { createFileRoute } from "@tanstack/react-router";
import BulkScanner from "@/components/wallet/BulkScanner";
import { useWallet } from "@/lib/WalletContext";

export const Route = createFileRoute("/_authed/scan")({
  ssr: false,
  head: () => ({ meta: [{ title: "Bulk wallet check · Meridian" }] }),
  component: ScanPage,
});

function ScanPage() {
  const { phrases, addPhrases } = useWallet();

  return (
    <div className="animate-rise space-y-5">
      <header>
        <p className="label-xs">Bulk checker</p>
        <h1 className="mt-2 font-heading text-[26px] font-semibold leading-tight text-white">
          Check all your wallets
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/40">
          {phrases.length > 0
            ? `${phrases.length} saved ${phrases.length === 1 ? "wallet" : "wallets"} on this device — they're checked automatically. Addresses are derived here; only public addresses leave your device.`
            : "Paste your recovery phrases once, one per line, or upload a .txt file. They're saved encrypted on this device and checked automatically next time."}
        </p>
      </header>

      <BulkScanner savedPhrases={phrases} onSave={addPhrases} autoRun />
    </div>
  );
}