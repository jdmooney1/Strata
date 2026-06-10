"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

interface ApprovalDecisionFormProps {
  workflowId: string;
  approvalId: string;
}

export function ApprovalDecisionForm({
  workflowId,
  approvalId,
}: ApprovalDecisionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");

  async function submitDecision(decision: "APPROVED" | "REJECTED") {
    const res = await fetch(
      `/api/workflows/${workflowId}/approvals/${approvalId}/decide`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerId: "user_admin_001",
          decision,
          note: comment.trim() || undefined,
        }),
      }
    );
    if (res.ok) {
      setComment("");
      startTransition(() => router.refresh());
    }
  }

  return (
    <div
      className="flex-1 min-w-0 flex flex-col gap-2 rounded-md p-3"
      style={{
        background: "var(--color-slate-50)",
        border: "1px solid var(--color-border)",
      }}
    >
      <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
        Your Approval Decision
      </p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (optional)"
        rows={2}
        className="text-xs border border-[var(--color-border)] rounded px-2 py-1.5 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-navy-400)]"
      />
      <div className="flex gap-2">
        <button
          onClick={() => submitDecision("APPROVED")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-[var(--color-status-green)] text-white hover:opacity-80 disabled:opacity-40"
        >
          <CheckCircle2 className="size-3.5" />
          Approve
        </button>
        <button
          onClick={() => submitDecision("REJECTED")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-[var(--color-status-red)] text-white hover:opacity-80 disabled:opacity-40"
        >
          <XCircle className="size-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
}
