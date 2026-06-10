import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity Log" };
export const dynamic = "force-dynamic";

const ORG_ID_USERS = ["user_admin_001"]; // users belonging to org_sanyo_001

const ACTION_LABELS: Record<string, string> = {
  "asset.create":        "Asset created",
  "asset.update":        "Asset updated",
  "workflow.create":     "Workflow created",
  "workflow.start":      "Workflow started",
  "step.complete":       "Step completed",
  "step.block":          "Step blocked",
  "memory.create":       "Memory stored",
  "memory.delete":       "Memory deleted",
  "report.generate":     "Report generated",
  "report.approve":      "Report approved",
  "document.upload":     "Document uploaded",
  "document.extract":    "Document extracted",
};

const ENTITY_LABELS: Record<string, string> = {
  Asset:        "Asset",
  Workflow:     "Workflow",
  WorkflowStep: "Step",
  Report:       "Report",
  Document:     "Document",
  Memory:       "Memory",
};

async function ActivityContent() {
  const logs = await db.auditLog.findMany({
    where: { userId: { in: ORG_ID_USERS } },
    include: { user: { select: { name: true, nameJa: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const actionCounts: Record<string, number> = {};
  for (const log of logs) {
    actionCounts[log.action] = (actionCounts[log.action] ?? 0) + 1;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Activity Log</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            操作履歴 — Append-only record of all system actions
          </p>
        </div>
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
          <span className="font-numeric font-semibold text-[var(--color-text-primary)]">{logs.length}</span>
          {" "}entries
        </span>
      </div>

      {/* Action summary */}
      {Object.keys(actionCounts).length > 0 && (
        <div className="data-card overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {Object.keys(actionCounts).map((action) => (
                  <th key={action} className="px-4 py-2.5 text-left section-label whitespace-nowrap">
                    {ACTION_LABELS[action] ?? action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {Object.values(actionCounts).map((count, i) => (
                  <td key={i} className="px-4 py-3">
                    <span className="text-sm font-semibold font-numeric">{count}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Log table */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">Event Log</h2>
          <span className="badge badge-gray">{logs.length}</span>
        </div>
        {logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
            No activity recorded yet. Actions like creating workflows, completing steps, and generating reports will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)]">Action</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)]">Entity</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)]">Detail</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)]">User</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)]">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const after = log.after as Record<string, unknown> | null;
                  const detail = after?.status ?? after?.title ?? after?.action ?? null;

                  return (
                    <tr key={log.id} className="border-b border-[var(--color-border)] last:border-0 table-row-hover">
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium text-[var(--color-text-primary)]">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-mono font-semibold text-[var(--color-text-muted)] tracking-wider">
                          {ENTITY_LABELS[log.entity] ?? log.entity}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-xs">
                        {detail != null ? (
                          <span className="text-xs text-[var(--color-text-secondary)] truncate block">
                            {String(detail)}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)] font-mono">
                            {log.entityId.slice(0, 12)}…
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {log.user.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs text-[var(--color-text-muted)] font-numeric">
                          {formatRelative(log.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-[var(--color-slate-100)] rounded w-48" />
      <div className="data-card h-48 bg-[var(--color-slate-50)]" />
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<ActivityLoading />}>
      <ActivityContent />
    </Suspense>
  );
}
