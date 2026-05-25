"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, CheckCircle } from "lucide-react";

const MEMORY_TYPE_LABELS: Record<string, string> = {
  BOARD_DECISION:       "Board Decision",
  INVESTMENT_RATIONALE: "Investment Rationale",
  COVENANT_DISCUSSION:  "Covenant Discussion",
  REFINANCING_DECISION: "Refinancing Decision",
  OPERATIONAL_INCIDENT: "Operational Incident",
  LENDER_DISCUSSION:    "Lender Discussion",
  ASSUMPTION_CHANGE:    "Assumption Change",
  RISK_ASSESSMENT:      "Risk Assessment",
  TENANT_DISCUSSION:    "Tenant Discussion",
  LEGAL_ADVICE:         "Legal Advice",
  TAX_POSITION:         "Tax Position",
  OTHER:                "Other",
};

interface Asset {
  id: string;
  name: string;
}

interface Props {
  orgId: string;
  assets: Asset[];
}

export function AddMemoryForm({ orgId, assets }: Props) {
  const [memoryType, setMemoryType] = useState("BOARD_DECISION");
  const [assetId, setAssetId]       = useState("");
  const [importance, setImportance] = useState("MEDIUM");
  const [title, setTitle]           = useState("");
  const [content, setContent]       = useState("");
  const [contentJa, setContentJa]   = useState("");
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          assetId: assetId || null,
          memoryType,
          importance,
          title,
          content,
          contentJa: contentJa || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(data.error || `Error ${res.status}`);
      }
      setDone(true);
      setTitle(""); setContent(""); setContentJa("");
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  function handleReset() {
    setDone(false);
    setError(null);
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 py-4">
        <CheckCircle className="size-5 text-[var(--color-status-green)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-status-green)]">Memory record saved</p>
          <button onClick={handleReset} className="text-xs text-[var(--color-text-muted)] hover:underline mt-0.5">
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-xs text-[var(--color-status-red)] bg-[var(--color-status-red-bg)] border border-[var(--color-status-red)] rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div>
        <label className="section-label block mb-1.5">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. ANZ covenant waiver — Q2 2026"
          className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <label className="section-label block mb-1.5">Memory Type</label>
          <select
            value={memoryType}
            onChange={(e) => setMemoryType(e.target.value)}
            className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]"
          >
            {Object.entries(MEMORY_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="section-label block mb-1.5">Related Asset</label>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]"
          >
            <option value="">Portfolio-wide</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="section-label block mb-1.5">Importance</label>
          <select
            value={importance}
            onChange={(e) => setImportance(e.target.value)}
            className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]"
          >
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      <div>
        <label className="section-label block mb-1.5">Content (English) *</label>
        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          placeholder="Record the decision, discussion, or context..."
          className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)] resize-none"
        />
      </div>

      <div>
        <label className="section-label block mb-1.5">Content (日本語) — optional</label>
        <textarea
          rows={3}
          value={contentJa}
          onChange={(e) => setContentJa(e.target.value)}
          placeholder="日本語での内容を記録..."
          className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)] resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !title || !content}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ background: "var(--color-navy-700)" }}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
          Save Memory Record
        </button>
      </div>
    </form>
  );
}
