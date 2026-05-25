import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { db } from "@/lib/db";
import {
  formatDate,
  priorityBadgeClass,
  taskStatusBadgeClass,
  countryFlag,
  daysUntil,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  REPORTING:            "Reporting",
  COMPLIANCE:           "Compliance",
  COVENANT:             "Covenant",
  REFINANCING:          "Refinancing",
  LEASE_MANAGEMENT:     "Lease Management",
  CAPEX:                "CAPEX",
  LEGAL:                "Legal",
  LENDER_COMMUNICATION: "Lender Comms",
  PM_REVIEW:            "PM Review",
  FX_MANAGEMENT:        "FX Management",
  BOARD_PREPARATION:    "Board Prep",
  DOCUMENT_COLLECTION:  "Document Collection",
  OTHER:                "Other",
};

async function TasksContent() {
  const tasks = await db.task.findMany({
    where: { orgId: "org_sanyo_001" },
    include: {
      asset: { select: { id: true, name: true, country: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const openTasks    = tasks.filter((t) => t.status === "OPEN");
  const activeTasks  = tasks.filter((t) => t.status === "IN_PROGRESS");
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED");
  const overdue      = tasks.filter((t) => {
    if (!t.dueDate || t.status === "COMPLETE" || t.status === "CANCELLED") return false;
    return (daysUntil(t.dueDate) ?? 0) < 0;
  });

  // Sort by priority then due date
  const PRIORITY_ORDER: Record<string, number> = {
    CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
  };
  const sortedTasks = [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 4;
    const pb = PRIORITY_ORDER[b.priority] ?? 4;
    return pa - pb;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Task Management</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            タスク管理 — Operational workflow coordination
          </p>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Open",        labelJa: "未着手",     value: openTasks.length,    color: "" },
          { label: "In Progress", labelJa: "進行中",     value: activeTasks.length,  color: activeTasks.length > 0 ? "text-[var(--color-status-blue)]" : "" },
          { label: "Blocked",     labelJa: "ブロック中", value: blockedTasks.length, color: blockedTasks.length > 0 ? "text-[var(--color-status-red)]" : "" },
          { label: "Overdue",     labelJa: "期限超過",   value: overdue.length,      color: overdue.length > 0 ? "text-[var(--color-status-red)]" : "" },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className={`text-2xl font-semibold font-numeric mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Task table */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">All Tasks</h2>
          <span className="badge badge-gray">{tasks.length} tasks</span>
        </div>

        {tasks.length === 0 ? (
          <div className="p-10 text-center">
            <CheckSquare className="size-8 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">No tasks yet</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Tasks are created from document extraction or manually assigned
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Task</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Asset</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Category</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Priority</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Assignee</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Due Date</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map((task, i) => {
                  const days = daysUntil(task.dueDate);
                  const isOverdue =
                    days !== null &&
                    days < 0 &&
                    task.status !== "COMPLETE" &&
                    task.status !== "CANCELLED";

                  return (
                    <tr
                      key={task.id}
                      className={`table-row-hover border-b border-[var(--color-border)] last:border-0 ${
                        isOverdue
                          ? "bg-[var(--color-status-red-bg)]"
                          : i % 2 === 1
                          ? "bg-[var(--color-slate-50)/30]"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium leading-tight">{task.title}</p>
                        {task.titleJa && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {task.titleJa}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        {task.asset ? (
                          <Link href={`/assets/${task.asset.id}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{countryFlag(task.asset.country)}</span>
                              <span className="text-xs text-[var(--color-text-secondary)] hover:underline leading-tight">
                                {task.asset.name}
                              </span>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">Portfolio-wide</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="badge badge-navy text-xs">
                          {CATEGORY_LABELS[task.category] ?? task.category}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`badge ${priorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="size-6 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                              style={{ background: "var(--color-navy-600)" }}
                            >
                              {task.assignee.name.charAt(0)}
                            </div>
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              {task.assignee.name.split(" ")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        {task.dueDate ? (
                          <>
                            <p
                              className={`text-sm font-numeric ${
                                isOverdue ? "text-[var(--color-status-red)] font-semibold" : ""
                              }`}
                            >
                              {formatDate(task.dueDate.toISOString(), "medium")}
                            </p>
                            {days !== null && (
                              <p
                                className={`text-xs ${
                                  isOverdue
                                    ? "text-[var(--color-status-red)]"
                                    : days <= 7
                                    ? "text-[var(--color-status-amber)]"
                                    : "text-[var(--color-text-muted)]"
                                }`}
                              >
                                {isOverdue
                                  ? `${Math.abs(days)}d overdue`
                                  : `${days}d`}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`badge ${taskStatusBadgeClass(task.status)}`}>
                          {task.status.replace("_", " ")}
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

function TasksLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-[var(--color-slate-100)] rounded w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="data-card p-4">
            <div className="h-3 bg-[var(--color-slate-100)] rounded w-16 mb-2" />
            <div className="h-7 bg-[var(--color-slate-100)] rounded w-8" />
          </div>
        ))}
      </div>
      <div className="data-card p-8 text-center">
        <div className="h-4 bg-[var(--color-slate-100)] rounded w-40 mx-auto" />
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TasksContent />
    </Suspense>
  );
}
