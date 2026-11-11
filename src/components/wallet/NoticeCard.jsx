import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NoticeCard({ className }) {
  return (
    <div className={cn("glass flex items-start gap-3 px-4 py-3.5", className)}>
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#3B82F6]/10 text-[#3B82F6]">
        <Radio size={13} />
      </span>
      <p className="text-[11.5px] leading-relaxed text-white/40">
        Balances, fees and transfers come straight from the chain. Your keys are derived from your seed phrase on this
        device and are never sent anywhere.
      </p>
    </div>
  );
}