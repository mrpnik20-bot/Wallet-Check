import { useRef } from "react";
import { cn } from "@/lib/utils";

export default function PinInput({ value = "", onChange, length = 4, disabled = false }) {
  const refs = useRef([]);
  const chars = Array.from({ length }, (_, index) => value[index] || "");

  const apply = (index, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...chars];
    next[index] = digit;
    onChange(next.join(""));
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !chars[index] && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    event.preventDefault();
    onChange(digits);
    refs.current[Math.min(digits.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2.5" onPaste={handlePaste}>
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={char}
          onChange={(event) => apply(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          aria-label={`PIN digit ${index + 1}`}
          className={cn(
            "num h-14 min-w-0 flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.045] text-center text-[22px] text-white outline-none transition-colors",
            "placeholder:text-white/20 focus:border-[#3B82F6]/60 focus:bg-white/[0.07] disabled:opacity-50"
          )}
        />
      ))}
    </div>
  );
}