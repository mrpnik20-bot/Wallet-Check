import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getChain, isValidAddress } from "@/lib/chains";
import { useAccounts } from "@/lib/walletStore";
import { useWallet } from "@/lib/WalletContext";
import { formatUnits, parseUnits } from "@/lib/transfer";
import { signBitcoinTransfer, signEvmTransfer, signKind, signSolanaTransfer } from "@/lib/walletKeys";
import { broadcastTransfer, getTransferQuote } from "@/lib/server-fns";
import SendForm from "./SendForm";
import SendDialog from "./SendDialog";

const EXPLORERS = {
  ethereum: "https://etherscan.io/tx/",
  bnb: "https://bscscan.com/tx/",
  polygon: "https://polygonscan.com/tx/",
  avalanche: "https://snowtrace.io/tx/",
  bitcoin: "https://mempool.space/tx/",
  solana: "https://solscan.io/tx/",
};

export default function SendFlow({ initialChain }) {
  const { phrase, verifyPin } = useWallet();
  const { accounts, refresh } = useAccounts();
  const sendable = useMemo(() => accounts.filter((account) => signKind(account.chain_id)), [accounts]);

  const [chainId, setChainId] = useState(() =>
    initialChain && signKind(initialChain) ? initialChain : "ethereum"
  );
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("form");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);

  const chain = getChain(chainId);
  const account = accounts.find((item) => item.chain_id === chainId) || {};

  const requestQuote = async () => {
    const value = parseUnits(chainId, amount);
    const next = await getTransferQuote({
      data: { chain_id: chainId, from: account.address, amount: value.toString() },
    });
    setQuote(next);
    if (next.kind === "btc" && next.utxos.length === 0) {
      setError("No confirmed coins available to spend yet");
    } else if (value + BigInt(next.fee) > BigInt(next.balance)) {
      setError("Amount plus network fee is more than your balance");
    }
    return next;
  };

  const openReview = async () => {
    setError("");
    if (!account.address) {
      setError("This chain has no address yet");
      return;
    }
    if (!isValidAddress(chainId, to)) {
      setError(`Enter a valid ${chain?.name} address`);
      return;
    }
    if (parseUnits(chainId, amount) <= 0n) {
      setError("Enter an amount to send");
      return;
    }
    setQuote(null);
    setStage("review");
    setQuoting(true);
    try {
      await requestQuote();
    } catch (err) {
      setError(err?.message || "Couldn't prepare the transfer");
    } finally {
      setQuoting(false);
    }
  };

  const fillMax = async () => {
    setError("");
    if (!account.address) return;
    try {
      const next = await getTransferQuote({ data: { chain_id: chainId, from: account.address, amount: "0" } });
      const max = BigInt(next.balance) - BigInt(next.fee);
      if (max <= 0n) {
        setError("Not enough to cover the network fee");
        return;
      }
      setAmount(formatUnits(chainId, max));
    } catch (err) {
      setError(err?.message || "Couldn't read your balance");
    }
  };

  const confirmWithPin = async (pin) => {
    const ok = await verifyPin(pin);
    if (!ok) return false;
    setStage("sending");
    setError("");
    try {
      const value = parseUnits(chainId, amount);
      let raw;
      if (quote.kind === "evm") {
        raw = await signEvmTransfer(phrase, {
          chainId,
          to,
          valueWei: value.toString(),
          nonce: quote.nonce,
          gasPrice: quote.gasPrice,
          gasLimit: quote.gasLimit,
        });
      } else if (quote.kind === "btc") {
        raw = signBitcoinTransfer(phrase, {
          utxos: quote.utxos,
          to,
          amountSats: Number(value),
          changeSats: quote.change,
        });
      } else {
        raw = await signSolanaTransfer(phrase, {
          to,
          lamports: Number(value),
          blockhash: quote.blockhash,
        });
      }
      const result = await broadcastTransfer({ data: { chain_id: chainId, raw } });
      setSent(result.txid);
      setStage("done");
      refresh();
    } catch (err) {
      setError(err?.message || "The transfer couldn't be sent");
      setStage("review");
    }
    return true;
  };

  const close = () => {
    setStage("form");
    setQuote(null);
    setError("");
  };

  const reset = () => {
    setStage("form");
    setQuote(null);
    setSent(null);
    setTo("");
    setAmount("");
    setError("");
    toast.success("Transfer submitted");
  };

  const feeDisplay =
    quote && chain
      ? quote.kind === "evm"
        ? `${formatUnits("ethereum", quote.fee)} ${chain.symbol}`
        : quote.kind === "btc"
          ? `${formatUnits("bitcoin", quote.fee)} BTC`
          : `${formatUnits("solana", quote.fee)} SOL`
      : null;

  const totalDisplay =
    quote && chain ? `${formatUnits(chainId, parseUnits(chainId, amount) + BigInt(quote.fee))} ${chain.symbol}` : null;

  return (
    <>
      <SendForm
        sendable={sendable}
        chainId={chainId}
        onChain={(next) => {
          setChainId(next);
          setAmount("");
          setQuote(null);
          setError("");
        }}
        to={to}
        onTo={setTo}
        amount={amount}
        onAmount={setAmount}
        balance={account.amount}
        symbol={chain?.symbol}
        onMax={fillMax}
        onReview={openReview}
        error={stage === "form" ? error : ""}
      />

      <SendDialog
        open={stage !== "form"}
        stage={stage}
        onClose={close}
        onReset={reset}
        onPin={confirmWithPin}
        onPinStage={() => setStage("pin")}
        chain={chain}
        amount={amount}
        to={to}
        fee={feeDisplay}
        total={totalDisplay}
        quoting={quoting}
        error={error}
        sent={sent}
        explorer={sent ? `${EXPLORERS[chainId]}${sent}` : null}
      />
    </>
  );
}