import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Eye, KeyRound, Lock, Trash2, UserRound } from "lucide-react";
import { useWallet } from "@/lib/WalletContext";
import { resetWalletData, useAccounts } from "@/lib/walletStore";
import { shortAddress } from "@/lib/format";
import { getChain } from "@/lib/chains";
import NoticeCard from "@/components/wallet/NoticeCard";
import SeedDialog from "@/components/wallet/SeedDialog";
import ChangePinDialog from "@/components/wallet/ChangePinDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authed/settings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Settings · Meridian" }] }),
  component: SettingsPage,
});

function Row({ Icon, title, hint, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
    >
      <span
        className={
          danger
            ? "grid h-9 w-9 place-items-center rounded-full bg-rose-400/10 text-rose-300"
            : "grid h-9 w-9 place-items-center rounded-full bg-white/[0.05] text-white/60"
        }
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={danger ? "block text-[14px] text-rose-300/90" : "block text-[14px] text-white/85"}>
          {title}
        </span>
        <span className="block text-[11.5px] text-white/30">{hint}</span>
      </span>
      <ChevronRight size={15} className="shrink-0 text-white/20" />
    </button>
  );
}

function SettingsPage() {
  const { lock, forget } = useWallet();
  const { accounts } = useAccounts();
  const navigate = useNavigate();
  const [seedOpen, setSeedOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [forgetOpen, setForgetOpen] = useState(false);

  const removeWallet = async () => {
    setForgetOpen(false);
    try {
      await resetWalletData();
    } finally {
      forget();
      navigate({ to: "/setup", replace: true });
    }
  };

  return (
    <div className="space-y-5">
      <header className="animate-rise">
        <h1 className="font-display text-[32px] leading-none text-white">Settings</h1>
        <p className="mt-2 text-[13px] text-white/40">Your wallet and account</p>
      </header>

      <div className="glass flex items-center gap-3.5 px-5 py-4">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-white/50">
          <UserRound size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-medium text-white/90">Your wallet</p>
          <p className="truncate text-[12px] text-white/35">Opened with your seed phrase — stored on this device only</p>
        </div>
      </div>

      <section>
        <p className="label-xs mb-2.5 px-1">Security</p>
        <div className="glass divide-y divide-white/[0.055] overflow-hidden">
          <Row Icon={Eye} title="Show seed phrase" hint="Verified with your PIN" onClick={() => setSeedOpen(true)} />
          <Row Icon={KeyRound} title="Change PIN" hint="New 4-digit PIN" onClick={() => setPinOpen(true)} />
          <Row Icon={Lock} title="Lock wallet" hint="You'll need your PIN to open it again" onClick={lock} />
        </div>
      </section>

      <section>
        <p className="label-xs mb-2.5 px-1">Connected addresses</p>
        <div className="glass divide-y divide-white/[0.055] overflow-hidden">
          {accounts.map((account) => {
            const chain = getChain(account.chain_id);
            return (
              <div key={account.chain_id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-[12.5px] text-white/50">{chain?.symbol || account.chain_id}</span>
                <span className={account.address ? "num truncate text-[12px] text-white/70" : "text-[11.5px] text-white/25"}>
                  {account.address ? shortAddress(account.address, 10, 8) : "Not connected"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <NoticeCard />

      <section className="glass divide-y divide-white/[0.055] overflow-hidden">
        <Row
          Icon={Trash2}
          title="Remove wallet"
          hint="Deletes the phrase, PIN and addresses from this device"
          danger
          onClick={() => setForgetOpen(true)}
        />
      </section>

      <SeedDialog open={seedOpen} onOpenChange={setSeedOpen} />
      <ChangePinDialog open={pinOpen} onOpenChange={setPinOpen} />

      <AlertDialog open={forgetOpen} onOpenChange={setForgetOpen}>
        <AlertDialogContent className="border-white/10 bg-[#0A0F1A] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-[22px] font-normal text-white">
              Remove this wallet?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px] leading-relaxed text-white/40">
              The encrypted seed phrase, PIN and every connected address will be deleted from this device.
              Without the phrase you won't be able to get back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white/60 hover:bg-white/5 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={removeWallet} className="bg-rose-500 text-white hover:bg-rose-400">
              Yes, remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}