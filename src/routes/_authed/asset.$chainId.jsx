import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getChain } from "@/lib/chains";
import { useAccounts } from "@/lib/walletStore";
import { formatAmount, formatUsd, shortAddress } from "@/lib/format";
import { signKind } from "@/lib/walletKeys";
import { cn } from "@/lib/utils";
import ChainIcon from "@/components/wallet/ChainIcon";
import AddressForm from "@/components/wallet/AddressForm";
import NoticeCard from "@/components/wallet/NoticeCard";

export const Route = createFileRoute("/_authed/asset/$chainId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Asset · Meridian" }] }),
  component: AssetPage,
});

function AssetPage() {
  const { chainId } = Route.useParams();
  const { accounts, refresh } = useAccounts();
  const [copied, setCopied] = useState(false);

  const chain = getChain(chainId);
  const account = accounts.find((item) => item.chain_id === chainId);

  if (!chain || !account) {
    return (
      <div className="glass px-6 py-12 text-center">
        <p className="text-[14px] text-white/60">This chain wasn't found.</p>
        <Link to="/" className="mt-4 inline-block text-[13px] text-[#3B82F6]">
          Back to overview
        </Link>
      </div>
    );
  }

  const ready = typeof account.amount === "number";
  const price = account.price_usd;
  const up = Number(account.change_24h) >= 0;
  const sendable = Boolean(signKind(chainId));

  const copy = async () => {
    await navigator.clipboard.writeText(account.address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-7">
      <div className="animate-rise flex items-center gap-4">
        <ChainIcon chain={chain} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-[26px] leading-none text-white">{chain.name}</h1>
          <p className="mt-1.5 text-[12px] text-white/35">{chain.network}</p>
        </div>
      </div>

      <div className="glass px-5 py-6">
        <p className="label-xs">On-chain balance</p>
        <p className="num mt-2 text-[34px] leading-none text-white">
          {!account.address ? "—" : ready ? formatAmount(account.amount, 6) : "…"}{" "}
          <span className="text-[16px] text-white/45">{chain.symbol}</span>
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="num text-[13.5px] text-white/40">
            {ready && price ? formatUsd(account.amount * price) : account.error || "—"}
          </span>
          {ready && price && (
            <span className={cn("num text-[12px]", up ? "text-emerald-300/85" : "text-rose-300/85")}>
              {`${account.change_24h >= 0 ? "+" : ""}${Number(account.change_24h).toFixed(2)}%`}
            </span>
          )}
        </div>

        {!account.address && (
          <div className="mt-5">
            <AddressForm
              account={account}
              label="Public address for this chain"
              onSaved={async () => {
                await refresh();
              }}
            />
          </div>
        )}

        {account.address && (
          <button
            type="button"
            onClick={copy}
            className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-left transition-colors hover:border-white/15"
          >
            <span className="num truncate text-[12.5px] text-white/55">{shortAddress(account.address, 14, 10)}</span>
            {copied ? (
              <Check size={14} className="shrink-0 text-[#3B82F6]" />
            ) : (
              <Copy size={14} className="shrink-0 text-white/35" />
            )}
          </button>
        )}

        {account.address && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <a
              href={`${chain.explorer}${account.address}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[11.5px] text-white/35 transition-colors hover:text-white/70"
            >
              <ExternalLink size={12} /> View on explorer
            </a>
            <span className="text-[11px] text-white/25">
              {account.derived ? "Your address" : "Watch-only"}
            </span>
          </div>
        )}

        {account.address && sendable && (
          <Link
            to="/send"
            search={{ chain: chainId }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] py-3.5 text-[14px] font-semibold text-white"
          >
            <ArrowUpRight size={16} />
            Send {chain.symbol}
          </Link>
        )}

        {account.address && !sendable && (
          <p className="mt-4 text-[11.5px] leading-relaxed text-white/25">
            {chain.symbol} sending isn't supported yet — this address is watch-only.
          </p>
        )}
      </div>

      <NoticeCard />
    </div>
  );
}