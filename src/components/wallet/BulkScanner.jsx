import { useCallback, useEffect, useRef, useState } from "react";
import ScanInput from "./ScanInput";
import ScanResults from "./ScanResults";
import { MAX_PHRASES, parsePhrases, SCAN_CHAIN_IDS, scanPhrases } from "@/lib/walletScan";

const countLabel = (value) => value.toLocaleString("en-US");

export default function BulkScanner({ savedPhrases = [], onSave, autoRun = false }) {
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  const cancelRef = useRef(false);

  const run = useCallback(async (list) => {
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
    setProgress({ stage: "derive", done: 0, total: capped.length });
    try {
      const scanned = await scanPhrases(capped, setProgress, { isCancelled: () => cancelRef.current });
      if (cancelRef.current) setError("The check was stopped.");
      else setResults(scanned);
    } catch (err) {
      setError("The check stopped halfway. Please try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, []);

  const stop = useCallback(() => {
    cancelRef.current = true;
  }, []);

  useEffect(() => {
    if (!autoRun || started.current || savedPhrases.length === 0) return;
    started.current = true;
    run(savedPhrases);
  }, [autoRun, savedPhrases, run]);

  const submit = async (sources) => {
    const pasted = parsePhrases((sources || []).filter(Boolean).join("\n"));
    let list = savedPhrases;
    if (pasted.length > 0 && onSave) {
      try {
        list = (await onSave(pasted)) || savedPhrases;
      } catch (err) {
        list = savedPhrases;
      }
    } else if (pasted.length > 0) {
      list = pasted;
    }
    await run(list);
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
      {results && <ScanResults results={results} />}
    </div>
  );
}