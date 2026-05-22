import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare, Plus, Filter } from "lucide-react";
import { MOCK_TASKS, MOCK_ASSETS } from "@/lib/mock-data";
import {
  formatDate,
  priorityBadgeClass,
  taskStatusBadgeClass,
  countryFlag,
  daysUntil,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Tasks" };

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

export default function TasksPage() {
  const assetsMap = Object.fromEntries(MOCK_ASSETS.map((a) => [a.id, a]));

  const openTasks   = MOCK_TASKS.filter((t) => t.status === "OPEN");
  const activeTasks = MOCK_TASKS.filter((t) => t.status === "IN_PROGRESS");
  const blockedTasks = MOCK_TASKS.filter((t) => t.status === "BLOCKED");

  const overdue = MOCK_TASKS.filter((t) => {
    if (!t.dueDate || t.status === "COMPLETE" || t.status === "CANCELLED") return false;
    return (daysUntil(t.dueDate) ?? 0) < 0;
  });

  const sortedTasks = [...MOCK_TASKS].sort((a, b) => {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
    const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
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
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--color-border)] rounded-md bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)] transition-colors">
            <Filter className="size-3.5" />
            Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white transition-colors" style={{ background: "var(--color-navy-700)" }}>
            <Plus className="size-3.5" />
            New Task
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Open",        labelJa: "未着手",       value: openTasks.length,    color: "" },
          { label: "In Progress", labelJa: "進行中",       value: activeTasks.length,  color: "text-[var(--color-status-blue)]" },
          { label: "Blocked",     labelJa: "ブロック中",   value: blockedTasks.length, color: blockedTasks.length > 0 ? "text-[var(--color-status-red)]" : "" },
          { label: "Overdue",     labelJa: "期限超過",     value: overdue.length,      color: overdue.length > 0 ? "text-[var(--color-status-red)]" : "" },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className={`text-2xl font-semibold font-numeric mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Task Table */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">All Tasks</h2>
          <span className="badge badge-gray">{MOCK_TASKS.length} tasks</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                <th className="text-left px-4 py-3">Task</th>
                <th className="text-left px-3 py-3">Asset</th>
                <th className="text-left px-3 py-3">Category</th>
                <th className="text-center px-3 py-3">Priority</th>
                <th className="text-left px-3 py-3">Assignee</th>
                <th className="text-right px-3 py-3">Due Date</th>
                <th className="text-center px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task, i) => {
                const asset = task.assetId ? assetsMap[task.assetId] : null;
                const days = daysUntil(task.dueDate);
                const isOverdue = days !== null && days < 0;

                return (
                  <tr
                    key={task.id}
                    className={`table-row-hover border-b border-[var(--color-border)] last:border-0 ${
                      isOverdue ? "bg-[var(--color-status-red-bg)]" : i % 2 === 1 ? "bg-[var(--color-slate-50)/30]" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      {task.titleJa && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{task.titleJa}</p>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {asset ? (
                        <Link href={`/assets/${asset.id}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{countryFlag(asset.country)}</span>
                            <span className="text-xs text-[var(--color-text-secondary)] hover:underline leading-tight">
                              {asset.name}
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
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ background: "var(--color-navy-600)" }}>
                          {task.assigneeName?.charAt(0) ?? "?"}
                        </div>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {task.assigneeName?.split(" ")[0]}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <p className={`text-sm font-numeric ${isOverdue ? "text-[var(--color-status-red)] font-semibold" : ""}`}>
                        {formatDate(task.dueDate, "medium")}
                      </p>
                      {days !== null && (
                        <p className={`text-xs ${
                          isOverdue
                            ? "text-[var(--color-status-red)]"
                            : days <= 7
                            ? "text-[var(--color-status-amber)]"
                            : "text-[var(--color-text-muted)]"
                        }`}>
                          {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d`}
                        </p>
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
      </div>
    </div>
  );
}
