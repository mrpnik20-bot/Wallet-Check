import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SeedWords({ phrase }) {
  const words = phrase.split(" ");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(phrase);
    setCopied(true);
    toast.success("Seed phrase copied");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {words.map((word, index) => (
          <div
            key={`${word}-${index}`}
            className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-2"
          >
            <span className="num text-[10px] text-white/25">{String(index + 1).padStart(2, "0")}</span>
            <span className="truncate text-[12.5px] text-white/85">{word}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={copy}
        className="mt-3 flex items-center gap-2 text-[12px] text-white/35 transition-colors hover:text-white/70"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />} Copy phrase
      </button>
    </div>
  );
}