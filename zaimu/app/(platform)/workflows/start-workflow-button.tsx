"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";

interface StartWorkflowButtonProps {
  workflowId: string;
}

export function StartWorkflowButton({ workflowId }: StartWorkflowButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    const res = await fetch(`/api/workflows/${workflowId}/start`, {
      method: "POST",
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Failed to start workflow");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleStart}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded bg-[var(--color-navy-700)] text-white hover:bg-[var(--color-navy-800)] disabled:opacity-40"
      >
        <PlayCircle className="size-3.5" />
        {isPending ? "Starting…" : "Start Workflow"}
      </button>
      {error && (
        <p className="text-[10px] text-[var(--color-status-red)]">{error}</p>
      )}
    </div>
  );
}
