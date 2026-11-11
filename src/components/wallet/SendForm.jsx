import { getChain } from "@/lib/chains";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";

export default function SendForm({
  sendable,
  chainId,
  onChain,
  to,
  onTo,
  amount,
  onAmount,
  balance,
  symbol,
  onMax,
  onReview,
  error,
}) {
  const selected = sendable.find((item) => item.chain_id === chainId);

  return (
    <div className="space-y-5">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {sendable.map((item) => {
          const chain = getChain(item.chain_id);
          const isActive = item.chain_id === chainId;
          return (
            <button
              key={item.chain_id}
              type="button"
              onClick={() => onChain(item.chain_id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors",
                isActive
                  ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.09)]"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: chain?.color }} />
              {item.symbol}
            </button>
          );
        })}
      </div>

      <div className="glass-strong space-y-4 px-5 py-5">
        <div>
          <label className="label-xs" htmlFor="send-to">
            Recipient
          </label>
          <input
            id="send-to"
            value={to}
            onChange={(event) => onTo(event.target.value)}
            placeholder="Paste the destination address"
            autoComplete="off"
            spellCheck={false}
            className="num mt-2 w-full break-all rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[12.5px] text-white/85 outline-none transition-colors placeholder:text-white/20 focus:border-[#3B82F6]/50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label-xs" htmlFor="send-amount">
              Amount
            </label>
            <span className="num text-[11px] text-white/30">
              {typeof balance === "number" ? `Balance ${formatAmount(balance, 6)} ${symbol || ""}` : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 focus-within:border-[#3B82F6]/50">
            <input
              id="send-amount"
              value={amount}
              onChange={(event) => onAmount(event.target.value.replace(",", "."))}
              placeholder="0.0"
              inputMode="decimal"
              autoComplete="off"
              className="num min-w-0 flex-1 bg-transparent py-1 text-[17px] text-white outline-none placeholder:text-white/20"
            />
            <span className="shrink-0 text-[12px] text-white/35">{symbol}</span>
            <button
              type="button"
              onClick={onMax}
              className="shrink-0 rounded-full bg-[#3B82F6]/10 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#3B82F6]"
            >
              Max
            </button>
          </div>
        </div>

        {error && <p className="text-[11.5px] leading-relaxed text-rose-300/85">{error}</p>}

        <button
          type="button"
          onClick={onReview}
          disabled={!selected}
          className="w-full rounded-2xl bg-[#3B82F6] py-3.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          Review transfer
        </button>
      </div>
    </div>
  );
}