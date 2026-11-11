import { Outlet } from "@tanstack/react-router";
import { WalletProvider } from "@/lib/WalletContext";
import WalletGate from "./WalletGate";

export default function AuthedLayout() {
  return (
    <WalletProvider>
      <WalletGate>
        <Outlet />
      </WalletGate>
    </WalletProvider>
  );
}