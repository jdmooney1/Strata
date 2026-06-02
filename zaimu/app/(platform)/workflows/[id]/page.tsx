import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  GitBranch,
  Calendar,
  User,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { StepActionButtons } from "@/app/(platform)/workflows/step-action-buttons";
import { ApprovalDecisionForm } from "@/app/(platform)/workflows/approval-decision-form";
import { AnalyzeWorkflowButton } from "@/app/(platform)/workflows/analyze-button";
import { StartWorkflowButton } from "@/app/(platform)/workflows/start-workflow-button";
import type { StepStatus, StepType, WorkflowStatus } from "@/app/generated/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const wf = await db.workflow.findUnique({ where: { id }, select: { title: true } });
  return { title: wf?.title ?? "Workflow" };
}

// ─── Status helpers ──────────────────────────────────────────────────────────

function workflowStatusBadgeClass(status: WorkflowStatus): string {
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

function workflowTypeBadgeLabel(type: string): string {
  const map: Record<string, string> = {
    REFINANCING:             "Refinancing",
    LEASE_RENEWAL:           "Lease Renewal",
    VALUATION_UPDATE:        "Valuation Update",
    MONTHLY_REPORTING:       "Monthly Reporting",
    INSURANCE_RENEWAL:       "Insurance Renewal",
    COVENANT_REPORTING:      "Covenant Reporting",
    CAPEX_APPROVAL:          "CapEx Approval",
    ACQUISITION_ONBOARDING:  "Acquisition Onboarding",
    CUSTOM:                  "Custom",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

function stepTypeLabel(type: StepType): string {
  const map: Record<StepType, string> = {
    ACTION:          "Action",
    APPROVAL:        "Approval",
    DOCUMENT_UPLOAD: "Document",
    MILESTONE:       "Milestone",
    EXTERNAL:        "External",
  };
  return map[type] ?? type;
}

function stepStatusBadgeClass(status: StepStatus): string {
  switch (status) {
    case "COMPLETE":         return "badge-green";
    case "IN_PROGRESS":      return "badge-navy";
    case "PENDING_APPROVAL": return "badge-amber";
    case "BLOCKED":          return "badge-red";
    case "OVERDUE":          return "badge-red";
    case "SKIPPED":          return "badge-gray";
    default:                 return "badge-gray";
  }
}

// ─── Main content ─────────────────────────────────────────────────────────────

async function WorkflowDetailContent({ id }: { id: string }) {
  const workflow = await db.workflow.findUnique({
    where: { id },
    include: {
      asset: { select: { id: true, name: true, country: true, currency: true } },
      template: { select: { id: true, code: true, name: true, estimatedDays: true } },
      steps: {
        include: {
          owner: { select: { id: true, name: true } },
          approvals: {
            include: {
              decisions: {
                include: {
                  reviewer: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { stepOrder: "asc" },
      },
    },
  });

  if (!workflow) notFound();

  const allSteps = workflow.steps;
  const totalSteps = allSteps.length;
  const completedSteps = allSteps.filter(
    (s) => s.status === "COMPLETE" || s.status === "SKIPPED"
  ).length;
  const allStepsComplete = totalSteps > 0 && completedSteps === totalSteps;

  // Build a map of stepId → step for dependency rendering
  const stepById = new Map(allSteps.map((s) => [s.id, s]));

  // Collect all approval steps for the Approval Record section
  const allApprovals = allSteps.flatMap((s) =>
    s.approvals.map((a) => ({ ...a, stepName: s.name, stepId: s.id }))
  );

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/workflows"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Operational Workflows
      </Link>

      {/* Workflow header */}
      <div className="data-card">
        <div className="px-5 py-4 space-y-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge badge-gray">
                  {workflowTypeBadgeLabel(workflow.workflowType)}
                </span>
                <span
                  className={`badge ${workflowStatusBadgeClass(workflow.status)}`}
                >
                  {workflow.status}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mt-2">
                {workflow.title}
              </h1>
              {workflow.description && (
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {workflow.description}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <AnalyzeWorkflowButton workflowId={id} />
              {workflow.status === "DRAFT" && (
                <StartWorkflowButton workflowId={id} />
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <GitBranch className="size-3.5" />
              <Link
                href={`/assets/${workflow.asset.id}`}
                className="hover:underline text-[var(--color-text-secondary)] font-medium"
              >
                {workflow.asset.name}
              </Link>
            </span>
            {workflow.targetDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Target:{" "}
                <span className="font-medium text-[var(--color-text-secondary)]">
                  {formatDate(workflow.targetDate.toISOString(), "medium")}
                </span>
              </span>
            )}
            {workflow.startedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Started:{" "}
                <span className="font-medium text-[var(--color-text-secondary)]">
                  {formatDate(workflow.startedAt.toISOString(), "medium")}
                </span>
              </span>
            )}
            {workflow.completedAt && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" style={{ color: "var(--color-status-green)" }} />
                Completed:{" "}
                <span className="font-medium text-[var(--color-text-secondary)]">
                  {formatDate(workflow.completedAt.toISOString(), "medium")}
                </span>
              </span>
            )}
            {totalSteps > 0 && (
              <span className="flex items-center gap-1.5">
                {completedSteps}/{totalSteps} steps complete
              </span>
            )}
          </div>

          {/* Workflow analysis */}
          {workflow.aiSuggestions && (
            <div className="ai-insight">
              <p className="ai-insight-label">Workflow Analysis</p>
              <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
                {workflow.aiSuggestions}
              </p>
              {workflow.aiAnalyzedAt && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Analysed {formatDate(workflow.aiAnalyzedAt.toISOString(), "medium")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step timeline */}
      {totalSteps > 0 && (
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Step Timeline</h2>
            <span className="badge badge-gray">
              {completedSteps}/{totalSteps} complete
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)]">
                    Step
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)]">
                    Type
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)]">
                    Owner
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)]">
                    Due
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-[var(--color-text-secondary)]">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {allSteps.map((step) => {
                  const isOverdue =
                    step.dueDate != null &&
                    new Date(step.dueDate) < new Date() &&
                    step.status !== "COMPLETE" &&
                    step.status !== "SKIPPED";

                  const depSteps = step.dependsOnStepIds
                    .map((depId) => stepById.get(depId))
                    .filter(Boolean);

                  const pendingApproval =
                    step.approvals.find((a) => a.status === "PENDING") ?? null;

                  const isDone =
                    step.status === "COMPLETE" || step.status === "SKIPPED";

                  return (
                    <tr
                      key={step.id}
                      className="border-b border-[var(--color-border)] last:border-0 table-row-hover"
                    >
                      {/* Step name */}
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-mono text-[var(--color-text-muted)] mb-0.5 tracking-wider">
                          S{String(step.stepOrder).padStart(2, "0")}
                        </p>
                        <p
                          className={`text-sm font-semibold ${
                            isDone ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"
                          }`}
                        >
                          {step.name}
                        </p>
                        {step.status === "COMPLETE" && step.completionNote && (
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 italic">
                            &ldquo;{step.completionNote}&rdquo;
                          </p>
                        )}
                        {step.status === "BLOCKED" && step.blockedReason && (
                          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--color-status-red)" }}>
                            ↳ {step.blockedReason}
                          </p>
                        )}
                        {depSteps.length > 0 && !isDone && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Awaiting: {depSteps.map((ds) => ds!.name).join(", ")}
                          </p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {stepTypeLabel(step.stepType)}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="px-3 py-3">
                        {step.owner ? (
                          <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                            <User className="size-3 flex-shrink-0" />
                            {step.owner.name}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>

                      {/* Due date */}
                      <td className="px-3 py-3 text-right">
                        {step.dueDate ? (
                          <span
                            className={`text-xs font-numeric ${
                              isOverdue
                                ? "font-semibold"
                                : "text-[var(--color-text-muted)]"
                            }`}
                            style={isOverdue ? { color: "var(--color-status-red)" } : undefined}
                          >
                            {formatDate(step.dueDate.toISOString(), "short")}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <span className={`badge ${stepStatusBadgeClass(step.status)}`}>
                          {step.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-right">
                        {workflow.status !== "COMPLETED" && workflow.status !== "CANCELLED" && (
                          <div className="flex flex-col items-end gap-1.5">
                            <StepActionButtons
                              stepId={step.id}
                              workflowId={id}
                              status={step.status}
                              hasApprovals={step.approvals.some((a) => a.status === "PENDING")}
                            />
                            {pendingApproval && (
                              <ApprovalDecisionForm
                                workflowId={id}
                                approvalId={pendingApproval.id}
                              />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Record */}
      {allApprovals.length > 0 && (
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Approval Record</h2>
            <span className="badge badge-gray">{allApprovals.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Approval
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Step
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Requested
                  </th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Status
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Decisions
                  </th>
                </tr>
              </thead>
              <tbody>
                {allApprovals.map((approval) => (
                  <tr
                    key={approval.id}
                    className="border-b border-[var(--color-border)] last:border-0 table-row-hover"
                  >
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-[var(--color-text-primary)]">
                        {approval.title}
                      </p>
                      {approval.dueDate && (
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                          Due {formatDate(approval.dueDate.toISOString(), "short")}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {approval.stepName}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatDate(approval.requestedAt.toISOString(), "medium")}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`badge ${
                          approval.status === "APPROVED"
                            ? "badge-green"
                            : approval.status === "REJECTED"
                            ? "badge-red"
                            : approval.status === "PENDING"
                            ? "badge-amber"
                            : "badge-gray"
                        }`}
                      >
                        {approval.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {approval.decisions.map((d) => (
                          <span
                            key={d.id}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              d.decision === "APPROVED"
                                ? "bg-green-50 text-green-700"
                                : d.decision === "REJECTED"
                                ? "bg-red-50 text-red-700"
                                : "bg-[var(--color-slate-50)] text-[var(--color-text-muted)]"
                            }`}
                          >
                            {d.reviewer.name}: {d.decision}
                          </span>
                        ))}
                        {approval.decisions.length === 0 && (
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            Awaiting decision
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {workflow.notes && (
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Notes</h2>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {workflow.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 bg-[var(--color-slate-100)] rounded w-32" />
      <div className="data-card p-5 space-y-3">
        <div className="h-7 bg-[var(--color-slate-100)] rounded w-80" />
        <div className="h-4 bg-[var(--color-slate-100)] rounded w-48" />
      </div>
      <div className="data-card p-4 h-64 bg-[var(--color-slate-50)]" />
    </div>
  );
}

export default async function WorkflowDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<WorkflowDetailLoading />}>
      <WorkflowDetailContent id={id} />
    </Suspense>
  );
}
