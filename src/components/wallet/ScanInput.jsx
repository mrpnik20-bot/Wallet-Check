import { useEffect, useRef, useState } from "react";
import { FileText, Square, X } from "lucide-react";
import { MAX_PHRASES, parsePhrases } from "@/lib/phraseParser";

const MAX_FILE_BYTES = 40 * 1024 * 1024;

const countLabel = (value) => value.toLocaleString("en-US");

export default function ScanInput({ busy, progress, error, onScan, onStop, savedCount = 0, chainCount = 13 }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [typedCount, setTypedCount] = useState(0);
  const fileRef = useRef(null);

  // Parsing a very large paste is deferred so typing stays smooth.
  useEffect(() => {
    const timer = setTimeout(() => setTypedCount(parsePhrases(text).length), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const count = typedCount + (file?.count || 0);
  const percent = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;

  const readFile = async (event) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    setFileError("");
    if (picked.size > MAX_FILE_BYTES) {
      setFileError("That file is too large. Use a file under 40 MB.");
      return;
    }
    const content = await picked.text();
    const found = parsePhrases(content);
    if (found.length === 0) {
      setFileError("No recovery phrase was found in that file.");
      return;
    }
    setFile({ name: picked.name, content, count: found.length });
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
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
        >
          <FileText size={12} />
          Upload file
        </button>
        <input ref={fileRef} type="file" accept=".txt,.csv,.json,.tsv,.log,.md,text/*" onChange={readFile} className="hidden" />
      </div>

      {file && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/10 px-3 py-2">
          <span className="min-w-0 truncate text-[11.5px] text-white/70">
            {file.name} · {countLabel(file.count)} phrases
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

      <button
        type="button"
        onClick={() => onScan([text, file?.content])}
        disabled={busy || (count === 0 && savedCount === 0)}
        className="mt-4 w-full rounded-2xl bg-[#3B82F6] py-3.5 text-[14px] font-semibold text-white transition-all enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {busy ? "Checking…" : "Check balances"}
      </button>

      {busy && progress && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11.5px] text-white/45">
            <span>{progress.stage === "derive" ? "Deriving addresses" : "Reading balances from the chains"}</span>
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