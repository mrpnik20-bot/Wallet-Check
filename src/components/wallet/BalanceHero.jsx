import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Eye, EyeOff, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { changeLabel, formatUsd, shortAddress } from "@/lib/format";

export default function BalanceHero({ total, change, chains, priced, address }) {
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const up = Number(change) >= 0;

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="animate-rise">
      <div className="flex items-center gap-1.5">
        <span className="label-xs">Total balance</span>
        <button
          type="button"
          onClick={() => setHidden((value) => !value)}
          aria-label={hidden ? "Show balance" : "Hide balance"}
          className="grid h-6 w-6 place-items-center rounded-full text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/80"
        >
          {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="num text-[42px] font-bold leading-none tracking-tight text-white sm:text-[52px]">
          {hidden ? "$ ••••" : priced ? formatUsd(total) : "$ —"}
        </span>
        {priced && <Zap size={18} className="shrink-0 text-[#3B82F6]" strokeWidth={2.4} aria-hidden="true" />}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
        {priced && (
          <span
            className={cn(
              "num rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
              up ? "bg-emerald-400/12 text-emerald-300" : "bg-rose-400/12 text-rose-300"
            )}
          >
            {changeLabel(change)}
          </span>
        )}
        {address ? (
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11.5px] text-white/55 transition-colors hover:bg-white/[0.1] hover:text-white/85"
          >
            <span className="num font-mono">{shortAddress(address)}</span>
            {copied ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
          </button>
        ) : (
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11.5px] text-white/40">No address yet</span>
        )}
        <span className="text-[11.5px] text-white/30">{chains} chains</span>
      </div>
    </div>
  );
}