"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

export function ResolveButton({ alertId }: { alertId: string }) {
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleResolve() {
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed");
      setDone(true);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      // Silently fail — the UI will revert on next refresh
    }
  }

  if (done) {
    return (
      <span className="flex items-center gap-1 text-xs text-[var(--color-status-green)]">
        <CheckCircle className="size-3" />
        Resolved
      </span>
    );
  }

  return (
    <button
      onClick={handleResolve}
      disabled={isPending}
      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded border border-current text-[var(--color-text-secondary)] hover:text-[var(--color-navy-700)] hover:border-[var(--color-navy-700)] opacity-70 hover:opacity-100 disabled:opacity-40 transition-all"
    >
      {isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : null}
      Resolve
    </button>
  );
}
