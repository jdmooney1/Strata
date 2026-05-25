"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";

interface UploadFormProps {
  orgId: string;
  assetId?: string;
  onSuccess?: (doc: unknown) => void;
}

const DOC_TYPES = [
  { value: "LOAN_AGREEMENT",      label: "Loan Agreement" },
  { value: "LEASE_AGREEMENT",     label: "Lease Agreement" },
  { value: "VALUATION_REPORT",    label: "Valuation Report" },
  { value: "PM_REPORT",           label: "PM Report" },
  { value: "INSURANCE_POLICY",    label: "Insurance Policy" },
  { value: "FINANCIAL_STATEMENT", label: "Financial Statement" },
  { value: "LENDER_STATEMENT",    label: "Lender Statement" },
  { value: "RENT_ROLL",           label: "Rent Roll" },
  { value: "TAX_DOCUMENT",        label: "Tax Document" },
  { value: "LEGAL_OPINION",       label: "Legal Opinion" },
  { value: "OTHER",               label: "Other" },
] as const;

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "extracting"; docId: string }
  | { status: "done"; docId: string; factsCount: number; missingInfo: string[] }
  | { status: "error"; message: string };

export function DocumentUploadForm({ orgId, assetId, onSuccess }: UploadFormProps) {
  const [file, setFile]         = useState<File | null>(null);
  const [docType, setDocType]   = useState("OTHER");
  const [name, setName]         = useState("");
  const [state, setState]       = useState<UploadState>({ status: "idle" });
  const [autoExtract, setAutoExtract] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setState({ status: "uploading" });

    try {
      // Step 1: Upload
      const form = new FormData();
      form.append("file", file);
      form.append("orgId", orgId);
      form.append("docType", docType);
      form.append("name", name || file.name);
      if (assetId) form.append("assetId", assetId);

      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || `Upload failed: ${uploadRes.status}`);
      }

      const { document: doc } = await uploadRes.json();

      if (!autoExtract) {
        setState({ status: "done", docId: doc.id, factsCount: 0, missingInfo: [] });
        onSuccess?.(doc);
        return;
      }

      // Step 2: Extract
      setState({ status: "extracting", docId: doc.id });

      const extractRes = await fetch(`/api/documents/${doc.id}/extract`, {
        method: "POST",
      });

      if (!extractRes.ok) {
        const err = await extractRes.json().catch(() => ({ error: "Extraction failed" }));
        // Non-fatal: document was uploaded, extraction failed
        setState({
          status: "done",
          docId: doc.id,
          factsCount: 0,
          missingInfo: [`Extraction failed: ${err.error}`],
        });
        onSuccess?.(doc);
        return;
      }

      const result = await extractRes.json();
      setState({
        status: "done",
        docId: doc.id,
        factsCount: result.factsExtracted || 0,
        missingInfo: result.missingInfo || [],
      });
      onSuccess?.(result.document);
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function reset() {
    setFile(null);
    setName("");
    setDocType("OTHER");
    setState({ status: "idle" });
    if (fileRef.current) fileRef.current.value = "";
  }

  const isProcessing = state.status === "uploading" || state.status === "extracting";

  if (state.status === "done") {
    return (
      <div className="border border-[var(--color-status-green)] bg-[var(--color-status-green-bg)] rounded-lg p-5">
        <div className="flex items-start gap-3">
          <CheckCircle className="size-5 text-[var(--color-status-green)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-status-green)]">
              Document processed successfully
            </p>
            {state.factsCount > 0 && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {state.factsCount} facts extracted by AI
              </p>
            )}
            {state.missingInfo.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-[var(--color-status-amber)]">
                  Gaps identified:
                </p>
                <ul className="mt-1 space-y-0.5">
                  {state.missingInfo.map((m, i) => (
                    <li key={i} className="text-xs text-[var(--color-text-secondary)] flex gap-1.5">
                      <span className="text-[var(--color-status-amber)]">·</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={reset}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
          >
            <X className="size-3.5" /> Upload another
          </button>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="border border-[var(--color-status-red)] bg-[var(--color-status-red-bg)] rounded-lg p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-[var(--color-status-red)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-status-red)]">Upload failed</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{state.message}</p>
          </div>
          <button
            onClick={reset}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          file
            ? "border-[var(--color-navy-400)] bg-[var(--color-navy-50)]"
            : "border-[var(--color-border-strong)] hover:border-[var(--color-navy-300)] hover:bg-[var(--color-slate-50)]"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,text/plain,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="size-6 text-[var(--color-navy-500)]" />
            <div className="text-left">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {(file.size / 1024).toFixed(1)} KB · {file.type || "unknown type"}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="size-7 text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Drop file here or click to browse
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              PDF or plain text · max 20 MB
            </p>
          </>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="section-label block mb-1.5">Document Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ANZ Facility Agreement 2024"
            className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]"
          />
        </div>
        <div>
          <label className="section-label block mb-1.5">Document Type</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-extract toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer">
        <div
          className={`relative w-8 h-4 rounded-full transition-colors ${
            autoExtract ? "bg-[var(--color-navy-700)]" : "bg-[var(--color-slate-300)]"
          }`}
          onClick={() => setAutoExtract(!autoExtract)}
        >
          <div className={`absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform ${
            autoExtract ? "translate-x-4" : "translate-x-0.5"
          }`} />
        </div>
        <div>
          <p className="text-xs font-medium">AI extraction after upload</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {autoExtract
              ? "Claude will extract facts, dates, obligations, and gaps"
              : "Upload only — run extraction manually later"}
          </p>
        </div>
      </label>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!file || isProcessing}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ background: "var(--color-navy-700)" }}
        >
          {isProcessing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {state.status === "uploading" ? "Uploading..." : "Extracting with AI..."}
            </>
          ) : (
            <>
              <Upload className="size-3.5" />
              {autoExtract ? "Upload & Extract" : "Upload"}
            </>
          )}
        </button>

        {isProcessing && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {state.status === "extracting"
              ? "AI is reading the document — this takes 15–45 seconds"
              : "Storing file..."}
          </p>
        )}
      </div>
    </form>
  );
}
