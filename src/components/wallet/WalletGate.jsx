import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useWallet } from "@/lib/WalletContext";
import AppShell from "./AppShell";

export default function WalletGate() {
  const { ready, unlocked } = useWallet();
  const path = useRouterState({ select: (state) => state.location.pathname });

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#3B82F6]" />
      </div>
    );
  }

  if (!unlocked) {
    return path === "/setup" ? <Outlet /> : <Navigate to="/setup" replace />;
  }

  if (path === "/setup") return <Navigate to="/" replace />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}