import { createFileRoute, Link } from "@tanstack/react-router";
import { useAccounts } from "@/lib/walletStore";
import BalanceHero from "@/components/wallet/BalanceHero";
import QuickActions from "@/components/wallet/QuickActions";
import ChainRow from "@/components/wallet/ChainRow";
import NoticeCard from "@/components/wallet/NoticeCard";

export const Route = createFileRoute("/_authed/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Portfolio · Meridian" }] }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { accounts, loading, refresh } = useAccounts();

  const connected = accounts.filter((account) => account.address);
  const priced = accounts.filter((account) => account.address && typeof account.amount === "number" && account.price_usd);
  const total = priced.reduce((sum, account) => sum + account.amount * account.price_usd, 0);
  const weighted =
    total > 0
      ? priced.reduce((sum, account) => sum + account.amount * account.price_usd * account.change_24h, 0) / total
      : 0;

  if (loading && accounts.length === 0) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="h-12 w-56 animate-pulse rounded-2xl bg-white/[0.06]" />
        </div>
        <div className="h-[72px] animate-pulse rounded-[22px] bg-white/[0.04]" />
        <div className="space-y-2.5">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-16 animate-pulse rounded-2xl bg-white/[0.03]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BalanceHero
        total={total}
        change={weighted}
        chains={accounts.length}
        priced={priced.length > 0}
        address={connected[0]?.address}
      />

      <QuickActions onRefresh={refresh} />

      {connected.length === 0 && (
        <div className="glass animate-rise px-5 py-6 text-center">
          <p className="text-[14px] text-white/80">No addresses connected yet</p>
          <p className="mx-auto mt-2 max-w-[320px] text-[12px] leading-relaxed text-white/35">
            Add a public address for any chain and its real on-chain balance shows up here.
          </p>
          <Link
            to="/receive"
            className="mt-4 inline-block rounded-xl bg-[#3B82F6] px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            Add an address
          </Link>
        </div>
      )}

      <section className="space-y-3.5">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-[17px] font-bold leading-none tracking-tight text-white">Crypto</h2>
          <Link to="/receive" className="text-[12.5px] font-medium text-[#3B82F6] transition-opacity hover:opacity-80">
            Manage
          </Link>
        </div>

        <div className="glass overflow-hidden">
          {accounts.map((account) => (
            <Link
              key={account.chain_id}
              to="/asset/$chainId"
              params={{ chainId: account.chain_id }}
              className="block border-b border-white/[0.055] last:border-b-0"
            >
              <ChainRow account={account} />
            </Link>
          ))}
        </div>
      </section>

      <NoticeCard />
    </div>
  );
}