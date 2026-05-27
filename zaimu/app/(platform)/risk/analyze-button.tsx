"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check } from "lucide-react";

interface AnalyzeButtonProps {
  eventId: string;
  variant?: "inline" | "primary";
}

export function AnalyzeButton({ eventId, variant = "inline" }: AnalyzeButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClick() {
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/risk/events/${eventId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setState("done");
      setTimeout(() => {
        router.refresh();
        setState("idle");
      }, 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Analysis failed");
      setState("error");
    }
  }

  const isPrimary = variant === "primary";

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={state === "loading" || state === "done"}
        className={
          isPrimary
            ? "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
            : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-slate-50)] disabled:opacity-60 transition-colors"
        }
        style={isPrimary ? { background: "var(--color-navy-700)" } : undefined}
      >
        {state === "loading" && <Loader2 className={isPrimary ? "size-4 animate-spin" : "size-3 animate-spin"} />}
        {state === "done" && <Check className={isPrimary ? "size-4" : "size-3"} />}
        {(state === "idle" || state === "error") && (
          <Sparkles className={isPrimary ? "size-4" : "size-3"} />
        )}
        {state === "loading"
          ? isPrimary ? "Analysing…" : "Analysing…"
          : state === "done"
          ? "Done!"
          : "Analyse with AI"}
      </button>
      {state === "error" && errorMsg && (
        <p className="text-xs text-[var(--color-status-red)] mt-1">{errorMsg}</p>
      )}
    </div>
  );
}
