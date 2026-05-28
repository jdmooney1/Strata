"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

interface AnalyzeWorkflowButtonProps {
  workflowId: string;
}

export function AnalyzeWorkflowButton({ workflowId }: AnalyzeWorkflowButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setError(null);
    const res = await fetch(`/api/workflows/${workflowId}/analyze`, {
      method: "POST",
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Analysis failed");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleAnalyze}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-[var(--color-navy-300)] text-[var(--color-navy-700)] hover:bg-[var(--color-navy-50)] disabled:opacity-40"
      >
        <Sparkles className="size-3.5" />
        {isPending ? "Analysing…" : "AI Analysis"}
      </button>
      {error && (
        <p className="text-[10px] text-[var(--color-status-red)]">{error}</p>
      )}
    </div>
  );
}
