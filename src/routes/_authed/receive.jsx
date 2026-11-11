import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getChain } from "@/lib/chains";
import { useAccounts } from "@/lib/walletStore";
import { formatAmount } from "@/lib/format";
import QrCode from "@/components/wallet/QrCode";
import AddressForm from "@/components/wallet/AddressForm";
import NoticeCard from "@/components/wallet/NoticeCard";

export const Route = createFileRoute("/_authed/receive")({
  ssr: false,
  head: () => ({ meta: [{ title: "Receive · Meridian" }] }),
  component: ReceivePage,
});

function ReceivePage() {
  const { accounts, refresh } = useAccounts();
  const [chainId, setChainId] = useState(null);
  const [copied, setCopied] = useState(false);

  const account = accounts.find((item) => item.chain_id === chainId) || accounts[0];
  const chain = account ? getChain(account.chain_id) : null;

  const copy = async () => {
    if (!account?.address) return;
    await navigator.clipboard.writeText(account.address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1600);
  };

  if (!chain || !account) return null;

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <h1 className="font-display text-[32px] leading-none text-white">Receive</h1>
        <p className="mt-2 text-[13px] text-white/40">Your own address, derived from your seed phrase</p>
      </header>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {accounts.map((item) => {
          const itemChain = getChain(item.chain_id);
          const active = item.chain_id === account.chain_id;
          return (
            <button
              key={item.chain_id}
              type="button"
              onClick={() => {
                setChainId(item.chain_id);
                setCopied(false);
              }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors",
                active
                  ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.09)]"
                  : "text-white/40 hover:text-white/70"
              )}
              style={active ? { color: itemChain?.color } : undefined}
            >
              {itemChain?.symbol}
              {item.address ? "" : " •"}
            </button>
          );
        })}
      </div>

      {!account.address ? (
        <div className="glass-strong animate-rise px-5 py-6">
          <p className="text-[14px] text-white/80">Watch-only {chain.name} address</p>
          <p className="mt-2 text-[12px] leading-relaxed text-white/35">
            {chain.name} signing isn't supported yet. Add a public address to follow its balance here.
          </p>
          <div className="mt-5">
            <AddressForm account={account} onSaved={refresh} />
          </div>
        </div>
      ) : (
        <div className="glass-strong animate-rise flex flex-col items-center px-5 py-8">
          <div className="rounded-3xl bg-white p-3 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)]">
            <QrCode value={account.address} size={196} className="rounded-xl" />
          </div>

          <p className="mt-6 text-[12.5px] text-white/40">
            {chain.name} ·{" "}
            {typeof account.amount === "number"
              ? `${formatAmount(account.amount, 6)} ${chain.symbol}`
              : "Fetching balance…"}
          </p>

          <button
            type="button"
            onClick={copy}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-left transition-colors hover:border-white/15"
          >
            <span className="num min-w-0 flex-1 break-all text-[12.5px] leading-relaxed text-white/75">
              {account.address}
            </span>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#3B82F6]/10 text-[#3B82F6]">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </span>
          </button>

          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-white/25">
            Only send on the {chain.network} network — funds sent on another network may be lost.
          </p>
        </div>
      )}

      <NoticeCard />
    </div>
  );
}