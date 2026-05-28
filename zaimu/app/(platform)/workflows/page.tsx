import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GitBranch, Plus, AlertCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { WorkflowStatus } from "@/app/generated/prisma";

export const metadata: Metadata = { title: "Operational Workflows" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DRAFT", label: "Draft" },
  { value: "COMPLETED", label: "Completed" },
];

function workflowStatusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE":    return "badge-navy";
    case "BLOCKED":   return "badge-red";
    case "DRAFT":     return "badge-gray";
    case "COMPLETED": return "badge-green";
    case "ON_HOLD":   return "badge-amber";
    case "CANCELLED": return "badge-gray";
    default:          return "badge-gray";
  }
}

async function WorkflowListContent({ statusFilter }: { statusFilter: string }) {
  const orgId = await getOrgId();

  const where = {
    orgId,
    ...(statusFilter !== "ALL" ? { status: statusFilter as WorkflowStatus } : {}),
  };

  const workflows = await db.workflow.findMany({
    where,
    include: {
      asset: { select: { id: true, name: true, country: true } },
      steps: { orderBy: { stepOrder: "asc" } },
    },
    orderBy: [{ status: "asc" }, { targetDate: "asc" }],
  });

  // Count by status for tab badges
  const counts = await db.workflow.groupBy({
    by: ["status"],
    where: { orgId },
    _count: true,
  });
  const countMap: Record<string, number> = {};
  for (const row of counts) {
    countMap[row.status] = row._count;
  }

  const total = Object.values(countMap).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="size-5 text-[var(--color-navy-600)]" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Operational Workflows
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              オペレーショナルワークフロー
            </p>
          </div>
        </div>
        <Link
          href="/workflows/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--color-navy-700)" }}
        >
          <Plus className="size-4" />
          New Workflow
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)] pb-0">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "ALL"
              ? total
              : (countMap[tab.value] ?? 0);
          const isActive = statusFilter === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "ALL" ? "/workflows" : `/workflows?status=${tab.value}`}
              className={[
                "px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-[var(--color-navy-700)] text-[var(--color-navy-700)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
              ].join(" ")}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-[var(--color-navy-100)] text-[var(--color-navy-700)]"
                      : "bg-[var(--color-slate-100)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Workflow list */}
      <div className="space-y-3">
        {workflows.length === 0 && (
          <div className="data-card">
            <div className="data-card-body text-center py-10">
              <GitBranch className="size-8 text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                No workflows found
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {statusFilter !== "ALL"
                  ? `No ${statusFilter.toLowerCase()} workflows at this time.`
                  : "Create a workflow to begin tracking an operational process."}
              </p>
              <Link
                href="/workflows/new"
                className="inline-flex items-center gap-1.5 mt-4 px-3 py-2 rounded-md text-xs font-semibold text-white"
                style={{ background: "var(--color-navy-700)" }}
              >
                <Plus className="size-3.5" />
                New Workflow
              </Link>
            </div>
          </div>
        )}

        {workflows.map((wf) => {
          const totalSteps = wf.steps.length;
          const completedSteps = wf.steps.filter(
            (s) => s.status === "COMPLETE" || s.status === "SKIPPED"
          ).length;

          // Current step: first IN_PROGRESS, else first NOT_STARTED
          const currentStep =
            wf.steps.find((s) => s.status === "IN_PROGRESS") ??
            wf.steps.find((s) => s.status === "NOT_STARTED") ??
            wf.steps[wf.steps.length - 1] ??
            null;

          const overdueSteps = wf.steps.filter(
            (s) =>
              s.status !== "COMPLETE" &&
              s.status !== "SKIPPED" &&
              s.dueDate != null &&
              new Date(s.dueDate) < new Date()
          );

          return (
            <Link key={wf.id} href={`/workflows/${wf.id}`} className="block">
              <div className="data-card hover:border-[var(--color-navy-300)] transition-colors cursor-pointer">
                <div className="px-4 py-3.5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Top row: status + title */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${workflowStatusBadgeClass(wf.status)}`}>
                        {wf.status}
                      </span>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                        {wf.title}
                      </p>
                    </div>

                    {/* Asset name */}
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {wf.asset.name}
                    </p>

                    {/* Progress line */}
                    <div className="flex items-center gap-3 mt-2">
                      {totalSteps > 0 && (
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Step {completedSteps + 1}/{totalSteps}
                          {currentStep && (
                            <span className="text-[var(--color-text-muted)]">
                              {" "}· {currentStep.name}
                            </span>
                          )}
                        </p>
                      )}

                      {overdueSteps.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-status-amber)]">
                          <AlertCircle className="size-3" />
                          {overdueSteps.length} overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target date */}
                  <div className="text-right flex-shrink-0">
                    {wf.targetDate && (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Due:{" "}
                        <span className="font-medium text-[var(--color-text-secondary)]">
                          {formatDate(wf.targetDate.toISOString(), "short")}
                        </span>
                      </p>
                    )}
                    {totalSteps > 0 && (
                      <div className="mt-1.5 w-24">
                        <div
                          className="rounded-full overflow-hidden"
                          style={{
                            height: "4px",
                            background: "var(--color-slate-100)",
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${
                                totalSteps > 0
                                  ? (completedSteps / totalSteps) * 100
                                  : 0
                              }%`,
                              background: "var(--color-navy-600)",
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 text-right">
                          {completedSteps}/{totalSteps} steps
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function WorkflowListLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-[var(--color-slate-100)] rounded w-48" />
        <div className="h-9 bg-[var(--color-slate-100)] rounded w-32" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="data-card p-4 h-20 bg-[var(--color-slate-50)]" />
        ))}
      </div>
    </div>
  );
}

export default async function WorkflowsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const statusFilter = sp.status ?? "ALL";

  return (
    <Suspense fallback={<WorkflowListLoading />}>
      <WorkflowListContent statusFilter={statusFilter} />
    </Suspense>
  );
}
