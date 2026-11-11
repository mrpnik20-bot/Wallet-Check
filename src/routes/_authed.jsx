import { createFileRoute } from "@tanstack/react-router";
import AuthedLayout from "@/components/wallet/AuthedLayout";

// No platform sign-in: access is the wallet's seed phrase + PIN (see WalletGate).
export const Route = createFileRoute("/_authed")({
  ssr: false,
  component: AuthedLayout,
});