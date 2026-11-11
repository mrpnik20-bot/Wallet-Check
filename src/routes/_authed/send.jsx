import { createFileRoute } from "@tanstack/react-router";
import SendFlow from "@/components/wallet/SendFlow";

export const Route = createFileRoute("/_authed/send")({
  ssr: false,
  validateSearch: (search) => ({
    chain: typeof search.chain === "string" ? search.chain : undefined,
  }),
  head: () => ({ meta: [{ title: "Send · Meridian" }] }),
  component: SendPage,
});

function SendPage() {
  const { chain } = Route.useSearch();

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <h1 className="font-display text-[32px] leading-none text-white">Send</h1>
        <p className="mt-2 text-[13px] text-white/40">Signed on this device, broadcast to the chain</p>
      </header>
      <SendFlow initialChain={chain} />
    </div>
  );
}