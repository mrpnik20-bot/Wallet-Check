import { useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", null, "0", "delete"];

export default function PinPad({ onComplete, errorText, disabled = false }) {
  const [value, setValue] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const callback = useRef(onComplete);

  useEffect(() => {
    callback.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (value.length !== 4) return undefined;
    let cancelled = false;
    setBusy(true);
    (async () => {
      const ok = await callback.current(value);
      if (cancelled) return;
      setBusy(false);
      if (!ok) {
        setFailed(true);
        setTimeout(() => {
          if (cancelled) return;
          setValue("");
          setFailed(false);
        }, 520);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    const onKey = (event) => {
      if (disabled || busy) return;
      if (/^[0-9]$/.test(event.key)) {
        setValue((current) => (current.length >= 4 ? current : current + event.key));
      } else if (event.key === "Backspace") {
        setValue((current) => current.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, busy]);

  const push = (digit) => {
    if (disabled || busy) return;
    setValue((current) => (current.length >= 4 ? current : current + digit));
  };

  return (
    <div className="flex flex-col items-center">
      <div className={cn("flex gap-3.5", failed && "animate-shake")}>
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "h-3 w-3 rounded-full transition-all duration-200",
              failed ? "bg-rose-400" : index < value.length ? "scale-110 bg-[#3B82F6]" : "bg-white/15"
            )}
          />
        ))}
      </div>

      <p className="mt-3 h-4 text-[11.5px] text-rose-300/85">
        {failed ? errorText || "Wrong PIN, try again" : ""}
      </p>

      <div className="mt-4 grid w-full max-w-[286px] grid-cols-3 gap-2.5">
        {KEYS.map((key, index) => {
          if (!key) return <span key={`gap-${index}`} />;
          if (key === "delete") {
            return (
              <button
                key="delete"
                type="button"
                onClick={() => setValue((current) => current.slice(0, -1))}
                className="grid h-14 place-items-center rounded-2xl text-white/40 transition-all hover:bg-white/[0.05] hover:text-white/80 active:scale-95"
                aria-label="Delete"
              >
                <Delete size={18} />
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => push(key)}
              className="num h-14 rounded-2xl bg-white/[0.045] text-[19px] text-white/85 transition-all hover:bg-white/[0.09] active:scale-95"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}