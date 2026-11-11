import { cn } from "@/lib/utils";

export default function ChainIcon({ chain, size = "md" }) {
  if (!chain) return null;
  const box = size === "lg" ? "h-14 w-14 text-[15px]" : "h-11 w-11 text-[12.5px]";
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold tracking-wide", box)}
      style={{
        background: `linear-gradient(145deg, ${chain.color}33, ${chain.color}0d)`,
        boxShadow: `inset 0 0 0 1px ${chain.color}55`,
        color: chain.color,
      }}
    >
      {chain.symbol.slice(0, 3)}
    </span>
  );
}