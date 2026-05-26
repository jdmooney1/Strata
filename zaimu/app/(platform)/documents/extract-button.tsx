"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type State = "idle" | "extracting" | "done" | "error";

export function ExtractButton({ docId }: { docId: string }) {
  const [state, setState] = useState<State>("idle");
  const [factsCount, setFactsCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleExtract() {
    setState("extracting");
    try {
      const res = await fetch(`/api/documents/${docId}/extract`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Extraction failed" }));
        throw new Error((err as { error?: string }).error || `Error ${res.status}`);
      }
      const data = (await res.json()) as { factsExtracted?: number };
      setFactsCount(data.factsExtracted ?? 0);
      setState("done");
      startTransition(() => { router.refresh(); });
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-status-green)]">
        <CheckCircle className="size-3" />
        {factsCount} facts
      </span>
    );
  }

  if (state === "error") {
    return (
      <button
        onClick={handleExtract}
        className="inline-flex items-center gap-1 text-xs text-[var(--color-status-red)] hover:underline"
      >
        <AlertCircle className="size-3" />
        Retry
      </button>
    );
  }

  if (state === "extracting" || isPending) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
        <Loader2 className="size-3 animate-spin" />
        Extracting…
      </span>
    );
  }

  return (
    <button
      onClick={handleExtract}
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border border-[var(--color-navy-300)] text-[var(--color-navy-700)] hover:bg-[var(--color-navy-50)] transition-colors"
    >
      <Sparkles className="size-3" />
      Extract
    </button>
  );
}
