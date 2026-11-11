import { Check, ExternalLink, Loader2 } from "lucide-react";
import { shortAddress } from "@/lib/format";
import PinPad from "./PinPad";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-[11.5px] text-white/35">{label}</span>
      <span className="num max-w-[62%] break-all text-right text-[12.5px] text-white/85">{value}</span>
    </div>
  );
}

export default function SendDialog({
  open,
  stage,
  onClose,
  onReset,
  onPin,
  onPinStage,
  chain,
  amount,
  to,
  fee,
  total,
  quoting,
  error,
  sent,
  explorer,
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && stage !== "sending" && onClose()}>
      <DialogContent className="max-w-[420px] border-white/10 bg-[#0A0F1A] text-white">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-normal text-white">
            {stage === "done" ? "Transfer sent" : stage === "pin" ? "Confirm with your PIN" : "Review transfer"}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-white/35">
            {stage === "done"
              ? "It's been broadcast to the network."
              : stage === "pin"
                ? "Your keys are unlocked on this device only."
                : `Sending on ${chain?.name}`}
          </DialogDescription>
        </DialogHeader>

        {stage === "review" && (
          <div>
            <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07] px-4 py-1">
              <Row label="To" value={shortAddress(to, 12, 10)} />
              <Row label="Amount" value={`${amount} ${chain?.symbol}`} />
              <Row label="Network fee" value={quoting ? "…" : fee || "—"} />
              <Row label="Total" value={quoting ? "…" : total || "—"} />
            </div>
            {error && <p className="mt-3 text-[11.5px] leading-relaxed text-rose-300/85">{error}</p>}
            <button
              type="button"
              disabled={quoting || !fee || Boolean(error)}
              onClick={onPinStage}
              className="mt-4 w-full rounded-2xl bg-[#3B82F6] py-3.5 text-[14px] font-semibold text-white disabled:opacity-40"
            >
              Confirm with PIN
            </button>
          </div>
        )}

        {stage === "pin" && (
          <div className="pt-2">
            {error && <p className="mb-2 text-center text-[11.5px] text-rose-300/85">{error}</p>}
            <PinPad onComplete={onPin} />
          </div>
        )}

        {stage === "sending" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={22} className="animate-spin text-[#3B82F6]" />
            <p className="text-[12.5px] text-white/45">Signing and broadcasting…</p>
          </div>
        )}

        {stage === "done" && (
          <div className="flex flex-col items-center py-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#3B82F6]/12 text-[#3B82F6]">
              <Check size={22} />
            </span>
            <p className="num mt-4 break-all text-center text-[11.5px] text-white/45">{sent}</p>
            {explorer && (
              <a
                href={explorer}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-1.5 text-[12px] text-[#3B82F6]"
              >
                <ExternalLink size={12} /> View transaction
              </a>
            )}
            <button
              type="button"
              onClick={onReset}
              className="mt-5 w-full rounded-2xl bg-white/[0.07] py-3 text-[13.5px] text-white/80"
            >
              Done
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}