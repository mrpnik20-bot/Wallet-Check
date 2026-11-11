import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getChain } from "@/lib/chains";
import { changeLabel, formatAmount, formatUsd } from "@/lib/format";
import ChainIcon from "./ChainIcon";

export default function ChainRow({ account }) {
  const chain = getChain(account.chain_id);
  if (!chain) return null;

  const connected = Boolean(account.address);
  const ready = connected && typeof account.amount === "number";
  const price = account.price_usd;
  const up = Number(account.change_24h) >= 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]">
      <ChainIcon chain={chain} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14.5px] font-semibold text-white">{chain.symbol}</span>
          {connected && <BadgeCheck size={13} className="shrink-0 text-[#3B82F6]" aria-label="Address connected" />}
          <span className="truncate rounded bg-white/[0.07] px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-wide text-white/45">
            {chain.network || chain.name}
          </span>
        </div>
        <p className="num mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] text-white/40">
          {price ? (
            <>
              <span>{formatUsd(price)}</span>
              <span className={up ? "text-emerald-300" : "text-rose-300"}>{changeLabel(account.change_24h)}</span>
            </>
          ) : (
            <span>{connected ? "Live balance" : "Not connected"}</span>
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {!connected ? (
          <span className="rounded-full bg-[#3B82F6]/12 px-2.5 py-1 text-[11px] font-medium text-[#3B82F6]">
            Connect
          </span>
        ) : (
          <>
            <p className={cn("num text-[14px] font-medium", ready ? "text-white" : "text-white/35")}>
              {ready ? formatAmount(account.amount, chain.decimals) : "—"}
            </p>
            <p className="num mt-0.5 text-[11.5px] text-white/40">
              {ready && price ? formatUsd(account.amount * price) : "—"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}