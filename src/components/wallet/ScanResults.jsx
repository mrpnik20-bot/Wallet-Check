import { useState } from "react";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAmount, formatUsd, shortAddress } from "@/lib/format";

const PAGE = 100;

export default function ScanResults({ results, total: scannedCount = results.length }) {
  const [fundedOnly, setFundedOnly] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const funded = results.filter((wallet) => wallet.holdings.length > 0);
  const total = funded.reduce((sum, wallet) => sum + wallet.total, 0);
  // Above a few thousand wallets only funded ones are kept, so there is no
  // empty list to switch to.
  const canShowAll = results.length > funded.length;
  const pool = fundedOnly || !canShowAll ? funded : results;
  const shown = pool.slice(0, limit);

  return (
    <div className="space-y-4">
      <div className="glass-strong p-4">
        <p className="label-xs">Total found</p>
        <p className="num mt-2 text-[30px] font-semibold leading-none text-white">{formatUsd(total)}</p>
        <p className="mt-2 text-[12px] text-white/40">
          {funded.length} of {scannedCount} wallets hold a balance
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-[16px] font-semibold text-white">Wallets</h2>
        {canShowAll && (
          <button
            type="button"
            onClick={() => {
              setFundedOnly((value) => !value);
              setLimit(PAGE);
            }}
            className="rounded-full border border-white/[0.09] px-3 py-1.5 text-[11.5px] text-white/55 transition-colors hover:text-white"
          >
            {fundedOnly ? "With balance only" : "All wallets"}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="glass px-4 py-6 text-center text-[12.5px] text-white/40">
          {canShowAll
            ? "No balance in these wallets yet. Try the full list to see every address."
            : "No balance in these wallets yet."}
        </p>
      ) : (
        <div className="space-y-2.5">
          {shown.map((wallet) => (
            <div key={wallet.index} className="glass p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-white">
                    Wallet {wallet.index}
                    {wallet.holdings.length > 0 && <BadgeCheck size={13} className="text-[#3B82F6]" />}
                  </p>
                  <p className="num mt-0.5 truncate text-[11px] text-white/35">
                    {shortAddress(wallet.addresses.ethereum || wallet.addresses.bitcoin || "")}
                  </p>
                </div>
                <p
                  className={cn(
                    "num shrink-0 text-[14px] font-semibold",
                    wallet.total > 0 ? "text-white" : "text-white/25"
                  )}
                >
                  {wallet.total > 0 ? formatUsd(wallet.total) : "—"}
                </p>
              </div>

              {wallet.holdings.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {wallet.holdings.map((holding) => (
                    <a
                      key={`${holding.kind}-${holding.chainId}-${holding.symbol}-${holding.name || ""}`}
                      href={holding.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/70 transition-colors hover:bg-white/[0.09] hover:text-white"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: holdingColor(holding.chainId) }} />
                      {holding.kind === "nft" ? (
                        <span className="max-w-[190px] truncate">
                          {holding.symbol} · {holding.name}
                        </span>
                      ) : (
                        <span className="num">
                          {formatAmount(holding.amount, 8)} {holding.symbol}
                        </span>
                      )}
                      {holding.usd ? <span className="text-white/35">{formatUsd(holding.usd)}</span> : null}
                      <ArrowUpRight size={11} className="text-white/30" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pool.length > shown.length && (
        <button
          type="button"
          onClick={() => setLimit((value) => value + PAGE)}
          className="w-full rounded-2xl border border-white/[0.09] py-3 text-[12.5px] font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          Show more · {pool.length - shown.length} left
        </button>
      )}
    </div>
  );
}

const COLORS = {
  bitcoin: "#F7931A",
  ethereum: "#7C8CF8",
  bnb: "#F3BA2F",
  polygon: "#8B6BE8",
  avalanche: "#E84142",
  solana: "#19E39B",
  tron: "#FF5A5A",
  litecoin: "#C7CBD1",
  dogecoin: "#D6B24A",
  ripple: "#3FC98A",
  base: "#0052FF",
  arbitrum: "#28A0F0",
  ton: "#0098EA",
  optimism: "#FF0420",
  zksync: "#8C8DFC",
  linea: "#61DFFF",
  scroll: "#FFEEDA",
  gnosis: "#3E6957",
  celo: "#35D07F",
  mantle: "#7B8BFF",
  blast: "#FCFC03",
};

const holdingColor = (chainId) => COLORS[chainId] || "#3B82F6";