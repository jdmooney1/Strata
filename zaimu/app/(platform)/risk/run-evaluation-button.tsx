"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";

interface RunEvaluationButtonProps {
  orgId: string;
  assetId?: string;
  variant?: "header" | "cta" | "asset";
}

export function RunEvaluationButton({
  orgId,
  assetId,
  variant = "header",
}: RunEvaluationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/risk/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, ...(assetId ? { assetId } : {}) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "cta") {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleClick}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: "var(--color-navy-700)" }}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {loading ? "Evaluating…" : "Run Evaluation"}
        </button>
        {error && (
          <p className="text-xs text-[var(--color-status-red)]">{error}</p>
        )}
      </div>
    );
  }

  if (variant === "asset") {
    return (
      <div>
        <button
          onClick={handleClick}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-slate-50)] transition-colors disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Play className="size-3" />
          )}
          {loading ? "Scanning…" : "Run Risk Scan"}
        </button>
        {error && (
          <p className="text-xs text-[var(--color-status-red)] mt-1">{error}</p>
        )}
      </div>
    );
  }

  // Default: header variant
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: "var(--color-navy-700)" }}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Play className="size-4" />
        )}
        {loading ? "Evaluating…" : "Run Evaluation"}
      </button>
      {error && (
        <p className="text-xs text-[var(--color-status-red)]">{error}</p>
      )}
    </div>
  );
}
