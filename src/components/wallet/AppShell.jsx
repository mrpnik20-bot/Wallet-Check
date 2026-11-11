import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, LayoutDashboard, Lock, ScanSearch, Settings } from "lucide-react";

const NAV = [
  { to: "/", label: "Wallet", Icon: LayoutDashboard, exact: true },
  { to: "/scan", label: "Scan", Icon: ScanSearch },
  { to: "/send", label: "Send", Icon: ArrowUpRight },
  { to: "/receive", label: "Receive", Icon: ArrowDownLeft },
  { to: "/settings", label: "Settings", Icon: Settings },
];

const BASE_LINK =
  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/90";
const ACTIVE_LINK =
  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold bg-[#3B82F6]/12 text-[#3B82F6]";
const BASE_TAB = "flex flex-col items-center gap-1 py-2 text-[10.5px] font-medium text-white/40 transition-colors";
const ACTIVE_TAB = "flex flex-col items-center gap-1 py-2 text-[10.5px] font-semibold text-[#3B82F6]";

export function BrandMark({ size = "md" }) {
  const box = size === "lg" ? "h-14 w-14 rounded-2xl text-[23px]" : "h-9 w-9 rounded-[11px] text-[16px]";
  return (
    <span
      className={`grid shrink-0 place-items-center bg-gradient-to-br from-[#3B82F6] to-[#6366F1] font-extrabold text-white shadow-[0_10px_26px_-12px_rgba(59,130,246,0.9)] ${box}`}
    >
      M
    </span>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <BrandMark />
      <span className="leading-none">
        <span className="block text-[16.5px] font-bold tracking-tight text-white">Meridian</span>
        <span className="mt-1 block text-[8.5px] uppercase tracking-[0.22em] text-white/35">multichain wallet</span>
      </span>
    </Link>
  );
}

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/[0.06] px-5 py-7 lg:flex">
        <Brand />
        <nav className="mt-9 flex-1 space-y-1">
          {NAV.map(({ to, label, Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={BASE_LINK}
              activeProps={{ className: ACTIVE_LINK }}
              activeOptions={{ exact: !!exact }}
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-xl border border-white/[0.07] px-3.5 py-2.5 text-[13px] text-white/45 transition-colors hover:border-white/15 hover:text-white/80"
        >
          <Lock size={15} className="shrink-0" />
          Lock wallet
        </Link>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-[#0B1220]/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Brand />
          <Link
            to="/settings"
            aria-label="Lock wallet"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-white/60 transition-colors hover:text-white"
          >
            <Lock size={15} />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-5 sm:px-6 lg:pb-16 lg:pt-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/[0.07] bg-[#0B1220]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {NAV.map(({ to, label, Icon, exact }) => (
          <Link
            key={to}
            to={to}
            className={BASE_TAB}
            activeProps={{ className: ACTIVE_TAB }}
            activeOptions={{ exact: !!exact }}
          >
            <Icon size={19} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}