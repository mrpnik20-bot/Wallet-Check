import { useState } from "react";
import { toast } from "sonner";
import { useWallet } from "@/lib/WalletContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PinPad from "./PinPad";

export default function ChangePinDialog({ open, onOpenChange }) {
  const { verifyPin, changePin } = useWallet();
  const [stage, setStage] = useState("current");
  const [nextPin, setNextPin] = useState("");

  const close = (next) => {
    if (!next) {
      setStage("current");
      setNextPin("");
    }
    onOpenChange(next);
  };

  const handle = async (pin) => {
    if (stage === "current") {
      const ok = await verifyPin(pin);
      if (!ok) return false;
      setStage("new");
      return true;
    }
    if (stage === "new") {
      setNextPin(pin);
      setStage("confirm");
      return true;
    }
    if (pin !== nextPin) return false;
    await changePin(pin);
    toast.success("PIN updated");
    close(false);
    return true;
  };

  const titles = {
    current: "Enter your current PIN",
    new: "Choose a new PIN",
    confirm: "Re-enter the new PIN",
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md border-white/10 bg-[#0A0F1A] text-white">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-normal text-white">{titles[stage]}</DialogTitle>
          <DialogDescription className="text-[12px] text-white/35">
            Your wallet is protected by a 4-digit PIN.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          <PinPad key={stage} onComplete={handle} errorText="PINs don't match" />
        </div>
      </DialogContent>
    </Dialog>
  );
}