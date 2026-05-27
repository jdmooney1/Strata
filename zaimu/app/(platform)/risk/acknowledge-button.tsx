"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

interface AcknowledgeButtonProps {
  eventId: string;
  status: string;
}

export function AcknowledgeButton({ eventId, status }: AcknowledgeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAcknowledged = status === "ACKNOWLEDGED";

  async function handleClick() {
    if (isAcknowledged) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/risk/events/${eventId}/acknowledge`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to acknowledge");
    } finally {
      setLoading(false);
    }
  }

  if (isAcknowledged) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
        <Check className="size-3" />
        Acknowledged
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-navy-600)] hover:text-[var(--color-navy-800)] disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Check className="size-3" />
        )}
        {loading ? "…" : "Acknowledge"}
      </button>
      {error && (
        <p className="text-xs text-[var(--color-status-red)] mt-0.5">{error}</p>
      )}
    </div>
  );
}
