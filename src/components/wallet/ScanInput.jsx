import { useEffect, useRef, useState } from "react";
import { FileText, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_PHRASES, parsePhrases } from "@/lib/phraseParser";
import { parseFilePhrases } from "@/lib/parsePool";

const MAX_FILE_BYTES = 500 * 1024 * 1024;

// Every text format the parser can read — phrases are picked out of any layout.
const FILE_TYPES =
  ".txt,.csv,.tsv,.json,.jsonl,.ndjson,.md,.log,.dat,.lst,.list,.sql,.xml,.yaml,.yml,.text,text/*,application/json";

const countLabel = (value) => value.toLocaleString("en-US");

export default function ScanInput({ busy, progress, error, onScan, onStop, savedCount = 0, chainCount = 13 }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [typedCount, setTypedCount] = useState(0);
  const [deep, setDeep] = useState(true);
  const [reading, setReading] = useState(null);
  const fileRef = useRef(null);

  // Parsing a very large paste is deferred so typing stays smooth.
  useEffect(() => {
    const timer = setTimeout(() => setTypedCount(parsePhrases(text).length), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const count = typedCount + (file?.phrases.length || 0);
  const percent = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;

  const readFile = async (event) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    setFileError("");
    if (picked.size > MAX_FILE_BYTES) {
      setFileError("That file is too large. Use a file under 500 MB.");
      return;
    }
    setReading({ done: 0, total: 1 });
    try {
      const { phrases, lines } = await parseFilePhrases(picked, setReading);
      if (phrases.length === 0) {
        setFile(null);
        setFileError(
          `No valid recovery phrase in that file — ${countLabel(lines)} lines read, all skipped.`
        );
        return;
      }
      setFile({ name: picked.name, phrases, lines });
    } finally {
      setReading(null);
    }
  };

  const clearAll = () => {
    setText("");
    setFile(null);
    setFileError("");
    setTypedCount(0);
  };

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between gap-2">
        <label className="label-xs" htmlFor="phrases">
          {savedCount > 0 ? "Add more wallets (optional)" : "Recovery phrases"}
        </label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || !!reading}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
        >
          <FileText size={12} />
          Upload file
        </button>
        <input ref={fileRef} type="file" accept={FILE_TYPES} onChange={readFile} className="hidden" />
      </div>

      {reading && (
        <div className="mt-2.5 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-[11.5px] text-white/55">
          Reading file… {countLabel(reading.done)}/{countLabel(reading.total)} ·{" "}
          {countLabel(reading.count || 0)} phrases found
        </div>
      )}

      {file && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/10 px-3 py-2">
          <span className="min-w-0 truncate text-[11.5px] text-white/70">
            {file.name} · {countLabel(file.phrases.length)} phrases
            {file.lines > file.phrases.length && (
              <span className="text-white/35">
                {" "}
                · {countLabel(file.lines - file.phrases.length)} lines skipped
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={busy}
            className="shrink-0 text-white/40 transition-colors hover:text-white disabled:opacity-40"
            aria-label="Remove file"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <textarea
        id="phrases"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={file ? 3 : 6}
        spellCheck={false}
        autoComplete="off"
        disabled={busy}
        placeholder={"Paste anything — lines, CSV, JSON, quotes, numbered lists…\nword one two three …"}
        className="mt-2.5 w-full resize-none rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/20 disabled:opacity-50"
      />

      <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px]">
        <span className="truncate text-white/30">
          {count > 0
            ? `${countLabel(count)} ${count === 1 ? "phrase" : "phrases"} · any format`
            : `Any text format · ${chainCount} chains each`}
        </span>
        {(count > 0 || text) && (
          <button
            type="button"
            onClick={clearAll}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1 text-white/35 transition-colors hover:text-white/70 disabled:opacity-40"
          >
            <X size={11} />
            Clear
          </button>
        )}
      </div>

      {count > MAX_PHRASES && (
        <p className="mt-2 text-[11px] text-amber-300/80">
          Up to {countLabel(MAX_PHRASES)} phrases are checked per run — the first {countLabel(MAX_PHRASES)} in this list.
        </p>
      )}
      {fileError && <p className="mt-2 text-[11.5px] text-rose-300/85">{fileError}</p>}

      {count > 1000 && count <= MAX_PHRASES && (
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          {countLabel(count)} phrases × {chainCount} chains — public nodes throttle lists this big,
          so check in batches of 500–1,000 for the fastest results.
        </p>
      )}

      <button
        type="button"
        onClick={() => setDeep((value) => !value)}
        disabled={busy}
        aria-pressed={deep}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-left transition-colors enabled:hover:border-white/20 disabled:opacity-50"
      >
        <span className="min-w-0">
          <span className="block text-[12.5px] font-medium text-white/80">Tokens, NFTs &amp; gifts</span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-white/35">
            Every Trust Wallet coin on BNB Chain plus ERC-20, SPL, TRC-20, TON jettons,
            NFTs and Telegram gifts — slower
          </span>
        </span>
        <span
          className={cn(
            "relative h-5 w-9 shrink-0 rounded-full transition-colors",
            deep ? "bg-[#3B82F6]" : "bg-white/15"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
              deep ? "left-[18px]" : "left-0.5"
            )}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={() => onScan(text, file?.phrases || [], deep)}
        disabled={busy || !!reading || (count === 0 && savedCount === 0)}
        className="mt-4 w-full rounded-2xl bg-[#3B82F6] py-3.5 text-[14px] font-semibold text-white transition-all enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {busy ? "Checking…" : "Check balances"}
      </button>

      {busy && progress && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11.5px] text-white/45">
            <span>
              {progress.stage === "derive"
                ? "Deriving addresses"
                : progress.stage === "collect"
                  ? "Reading tokens, NFTs & gifts"
                  : "Reading balances from the chains"}
            </span>
            <span className="num text-white/70">
              {countLabel(progress.done)}/{countLabel(progress.total)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#3B82F6] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          {onStop && (
            <button
              type="button"
              onClick={onStop}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] px-3 py-1.5 text-[11.5px] text-white/55 transition-colors hover:border-white/20 hover:text-white"
            >
              <Square size={10} />
              Stop
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[11.5px] text-rose-300/85">{error}</p>}
    </div>
  );
}