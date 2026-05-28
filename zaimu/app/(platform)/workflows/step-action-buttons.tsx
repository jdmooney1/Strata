"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { StepStatus } from "@/app/generated/prisma";

interface StepActionButtonsProps {
  stepId: string;
  workflowId: string;
  status: StepStatus;
  hasApprovals: boolean;
}

export function StepActionButtons({
  stepId,
  workflowId,
  status,
  hasApprovals,
}: StepActionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [showBlock, setShowBlock] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  async function handleComplete() {
    const res = await fetch(`/api/workflows/${workflowId}/steps/${stepId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() || undefined }),
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  async function handleBlock() {
    if (!blockReason.trim()) return;
    const res = await fetch(`/api/workflows/${workflowId}/steps/${stepId}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: blockReason.trim() }),
    });
    if (res.ok) {
      setShowBlock(false);
      setBlockReason("");
      startTransition(() => router.refresh());
    }
  }

  if (status === "COMPLETE" || status === "SKIPPED" || hasApprovals) {
    return null;
  }

  if (status === "NOT_STARTED") {
    return null;
  }

  return (
    <div className="space-y-2">
      {showBlock ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Reason for blocking…"
            className="flex-1 text-xs border border-[var(--color-border)] rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-navy-400)]"
          />
          <button
            onClick={handleBlock}
            disabled={isPending || !blockReason.trim()}
            className="btn-sm bg-[var(--color-status-red)] text-white hover:opacity-80 disabled:opacity-40"
          >
            Confirm Block
          </button>
          <button
            onClick={() => setShowBlock(false)}
            className="btn-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {(status === "IN_PROGRESS" || status === "OVERDUE") && (
            <>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Completion note (optional)"
                className="text-xs border border-[var(--color-border)] rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-navy-400)] w-48"
              />
              <button
                onClick={handleComplete}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-[var(--color-status-green)] text-white hover:opacity-80 disabled:opacity-40"
              >
                <CheckCircle2 className="size-3.5" />
                Mark Complete
              </button>
              <button
                onClick={() => setShowBlock(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-[var(--color-status-red)] text-[var(--color-status-red)] hover:bg-red-50 disabled:opacity-40"
              >
                <XCircle className="size-3.5" />
                Mark Blocked
              </button>
            </>
          )}
          {status === "BLOCKED" && (
            <button
              onClick={handleComplete}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-[var(--color-status-green)] text-white hover:opacity-80 disabled:opacity-40"
            >
              <CheckCircle2 className="size-3.5" />
              Resolve &amp; Complete
            </button>
          )}
          {status === "PENDING_APPROVAL" && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-status-amber)]">
              <AlertTriangle className="size-3.5" />
              Awaiting approval
            </span>
          )}
        </div>
      )}
    </div>
  );
}
