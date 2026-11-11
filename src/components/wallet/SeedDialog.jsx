import { useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PinPad from "./PinPad";
import SeedWords from "./SeedWords";

export default function SeedDialog({ open, onOpenChange }) {
  const { verifyPin, phrase } = useWallet();
  const [stage, setStage] = useState("pin");

  const handle = async (pin) => {
    const ok = await verifyPin(pin);
    if (!ok) return false;
    setStage("words");
    return true;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setStage("pin");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md border-white/10 bg-[#0A0F1A] text-white">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-normal text-white">
            {stage === "pin" ? "Enter your PIN" : "Your seed phrase"}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-white/35">
            {stage === "pin"
              ? "Enter your 4-digit PIN to view the seed phrase."
              : "Never share these 12 words with anyone."}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          {stage === "pin" ? (
            <PinPad onComplete={handle} />
          ) : (
            <SeedWords phrase={phrase || ""} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}