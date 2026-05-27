import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShieldAlert,
  Clock,
  Calendar,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { AcknowledgeButton } from "../acknowledge-button";
import { AnalyzeButton } from "../analyze-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await db.riskEvent.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: event?.title ?? "Risk Event" };
}

function severityBadge(severity: string) {
  switch (severity) {
    case "ESCALATED":
      return (
        <span
          className="inline-flex items-center gap-1.5 badge text-white"
          style={{ background: "var(--color-status-red)" }}
        >
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
          Escalated
        </span>
      );
    case "CRITICAL":
      return <span className="badge badge-red">Critical</span>;
    case "WARNING":
      return <span className="badge badge-amber">Warning</span>;
    case "INFORMATIONAL":
      return <span className="badge badge-gray">Info</span>;
    default:
      return <span className="badge badge-gray">{severity}</span>;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "OPEN":
      return <span className="badge badge-red">Open</span>;
    case "ACKNOWLEDGED":
      return <span className="badge badge-amber">Acknowledged</span>;
    case "ESCALATED":
      return <span className="badge" style={{ background: "var(--color-status-red)", color: "white" }}>Escalated</span>;
    case "RESOLVED":
      return <span className="badge badge-green">Resolved</span>;
    case "SUPPRESSED":
      return <span className="badge badge-gray">Suppressed</span>;
    default:
      return <span className="badge badge-gray">{status}</span>;
  }
}

function escalationLevelBadge(level: string) {
  switch (level) {
    case "NONE":
      return null;
    case "ANALYST":
      return <span className="badge badge-blue">Analyst</span>;
    case "SENIOR_ANALYST":
      return <span className="badge badge-navy">Senior Analyst</span>;
    case "FUND_MANAGER":
      return <span className="badge badge-amber">Fund Manager</span>;
    case "BOARD":
      return <span className="badge badge-red">Board</span>;
    default:
      return <span className="badge badge-gray">{level}</span>;
  }
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    LEASE: "Lease",
    DEBT: "Debt",
    REPORTING: "Reporting",
    COMPLIANCE: "Compliance",
    TREASURY: "Treasury",
  };
  return labels[category] ?? category;
}

export default async function RiskEventDetailPage({ params }: PageProps) {
  const { id } = await params;

  const event = await db.riskEvent.findUnique({
    where: { id },
    include: {
      asset: { select: { id: true, name: true, country: true } },
      escalations: { orderBy: { escalatedAt: "asc" } },
      rule: { select: { id: true, name: true, code: true, description: true } },
    },
  });

  if (!event) notFound();

  const now = new Date();
  const daysSinceDetected = Math.floor(
    (now.getTime() - event.firstDetectedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysUntilDue = event.dueDate
    ? Math.ceil((event.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

  const confidencePct = event.confidence != null ? Math.round(event.confidence * 100) : null;

  // Parse trigger data
  const triggerData =
    event.triggerData != null &&
    typeof event.triggerData === "object" &&
    !Array.isArray(event.triggerData)
      ? (event.triggerData as Record<string, unknown>)
      : null;

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <div>
        <Link
          href="/risk"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Risk Engine
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {severityBadge(event.severity)}
            {statusBadge(event.status)}
            <span className="badge badge-navy">{categoryLabel(event.category)}</span>
            {event.escalationLevel !== "NONE" && escalationLevelBadge(event.escalationLevel)}
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {event.title}
          </h1>
          {event.titleJa && (
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{event.titleJa}</p>
          )}
          {event.asset && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Asset:{" "}
              <Link
                href={`/assets/${event.asset.id}`}
                className="text-[var(--color-navy-600)] hover:underline font-medium"
              >
                {event.asset.name}
              </Link>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <AcknowledgeButton eventId={event.id} status={event.status} />
          {!event.aiAnalysis && <AnalyzeButton eventId={event.id} variant="primary" />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Event Details</h2>
              </div>
              {event.rule && (
                <span className="badge badge-gray text-xs">
                  Rule: {event.rule.code}
                </span>
              )}
            </div>
            <div className="data-card-body space-y-3">
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                {event.description}
              </p>
              {event.descriptionJa && (
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-border)] pt-3">
                  {event.descriptionJa}
                </p>
              )}
            </div>
          </div>

          {/* Recommended Action */}
          {event.recommendedAction && (
            <div
              className="rounded-lg p-4 border"
              style={{
                background: "var(--color-navy-50)",
                borderColor: "var(--color-navy-200)",
              }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-[var(--color-navy-600)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-navy-700)] uppercase tracking-wide mb-1">
                    Recommended Action
                  </p>
                  <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
                    {event.recommendedAction}
                  </p>
                  {event.recommendedActionJa && (
                    <p className="text-sm text-[var(--color-navy-700)] mt-2 leading-relaxed">
                      {event.recommendedActionJa}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Trigger Data */}
          {triggerData && Object.keys(triggerData).length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <h2 className="text-sm font-semibold">Trigger Data</h2>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Snapshot at time of detection
                </span>
              </div>
              <div className="data-card-body">
                <table className="w-full">
                  <tbody>
                    {Object.entries(triggerData).map(([key, val]) => (
                      <tr
                        key={key}
                        className="border-b border-[var(--color-border)] last:border-0"
                      >
                        <td className="py-2 pr-4 w-40">
                          <span className="text-xs font-medium text-[var(--color-text-secondary)] font-mono">
                            {key}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className="text-xs text-[var(--color-text-primary)] font-numeric">
                            {val === null
                              ? "null"
                              : typeof val === "object"
                              ? JSON.stringify(val)
                              : String(val)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confidence meter */}
          {confidencePct !== null && (
            <div className="data-card">
              <div className="data-card-header">
                <h2 className="text-sm font-semibold">Detection Confidence</h2>
                <span
                  className={`text-sm font-bold font-numeric ${
                    confidencePct >= 80
                      ? "text-[var(--color-status-green)]"
                      : confidencePct >= 60
                      ? "text-[var(--color-status-amber)]"
                      : "text-[var(--color-status-red)]"
                  }`}
                >
                  {confidencePct}%
                </span>
              </div>
              <div className="data-card-body">
                <div
                  className="rounded-full overflow-hidden"
                  style={{ height: "8px", background: "var(--color-slate-100)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${confidencePct}%`,
                      background:
                        confidencePct >= 80
                          ? "var(--color-status-green)"
                          : confidencePct >= 60
                          ? "var(--color-status-amber)"
                          : "var(--color-status-red)",
                    }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                  Based on {event.occurrenceCount} occurrence
                  {event.occurrenceCount !== 1 ? "s" : ""}
                  {event.recurrenceCount > 0 &&
                    `, ${event.recurrenceCount} recurrence${event.recurrenceCount !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">AI Analysis</h2>
              </div>
              {event.aiAnalyzedAt && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {formatDate(event.aiAnalyzedAt, "medium")}
                </span>
              )}
            </div>
            {event.aiAnalysis ? (
              <div className="data-card-body">
                <div className="ai-insight rounded-lg p-4">
                  <p className="text-sm text-[var(--color-navy-900)] leading-relaxed whitespace-pre-wrap">
                    {event.aiAnalysis}
                  </p>
                </div>
                {event.aiAnalysisJa && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-3 leading-relaxed">
                    {event.aiAnalysisJa}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <AnalyzeButton eventId={event.id} variant="inline" />
                </div>
              </div>
            ) : (
              <div className="data-card-body text-center py-6">
                <Sparkles className="size-6 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--color-text-muted)] mb-3">
                  No AI analysis yet for this risk event.
                </p>
                <AnalyzeButton eventId={event.id} variant="primary" />
              </div>
            )}
          </div>

          {/* Supporting documents */}
          {event.sourceDocumentIds.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[var(--color-navy-500)]" />
                  <h2 className="text-sm font-semibold">Supporting Documents</h2>
                </div>
                <span className="badge badge-gray">
                  {event.sourceDocumentIds.length}
                </span>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {event.sourceDocumentIds.map((docId) => (
                  <div key={docId} className="px-4 py-2.5 flex items-center gap-3">
                    <FileText className="size-4 text-[var(--color-navy-400)] flex-shrink-0" />
                    <span className="text-xs font-mono text-[var(--color-text-secondary)] truncate">
                      {docId}
                    </span>
                    {event.assetId && (
                      <Link
                        href={`/assets/${event.assetId}`}
                        className="ml-auto text-xs text-[var(--color-text-muted)] hover:text-[var(--color-navy-600)] flex-shrink-0"
                      >
                        View asset →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-5">
          {/* Temporal Timeline */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Timeline</h2>
              </div>
            </div>
            <div className="data-card-body">
              <ol className="relative border-l border-[var(--color-border)] ml-2 space-y-4">
                <TimelineItem
                  label="First Detected"
                  date={event.firstDetectedAt}
                  sub={daysSinceDetected === 0 ? "Today" : `${daysSinceDetected} days ago`}
                  active
                />
                <TimelineItem
                  label="Last Evaluated"
                  date={event.lastEvaluatedAt}
                  sub={`Occurrence #${event.occurrenceCount}`}
                />
                {event.acknowledgedAt && (
                  <TimelineItem
                    label="Acknowledged"
                    date={event.acknowledgedAt}
                    sub={event.acknowledgedBy ?? undefined}
                    color="amber"
                  />
                )}
                {event.dueDate && (
                  <TimelineItem
                    label="Due Date"
                    date={event.dueDate}
                    sub={
                      isOverdue
                        ? "Overdue!"
                        : daysUntilDue !== null
                        ? `${daysUntilDue} days`
                        : undefined
                    }
                    color={isOverdue ? "red" : "muted"}
                    future={!isOverdue}
                  />
                )}
                {event.resolvedAt && (
                  <TimelineItem
                    label="Resolved"
                    date={event.resolvedAt}
                    sub={event.resolvedBy ?? undefined}
                    color="green"
                  />
                )}
              </ol>
            </div>
          </div>

          {/* Event stats */}
          <div className="data-card">
            <div className="data-card-header">
              <h2 className="text-sm font-semibold">Event Stats</h2>
            </div>
            <div className="data-card-body space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">Rule Code</span>
                <span className="font-mono font-medium text-[var(--color-text-secondary)]">
                  {event.ruleCode}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">Occurrences</span>
                <span className="font-numeric font-medium">{event.occurrenceCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">Recurrences</span>
                <span className="font-numeric font-medium">{event.recurrenceCount}</span>
              </div>
              {event.suppressedUntil && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Suppressed until</span>
                  <span className="font-numeric font-medium">
                    {formatDate(event.suppressedUntil, "short")}
                  </span>
                </div>
              )}
              {event.lastResolvedAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Last resolved</span>
                  <span className="font-numeric font-medium">
                    {formatDate(event.lastResolvedAt, "short")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Escalation History */}
          {event.escalations.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-[var(--color-status-red)]" />
                  <h2 className="text-sm font-semibold">Escalation History</h2>
                </div>
                <span className="badge badge-red">{event.escalations.length}</span>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {event.escalations.map((esc) => (
                  <div key={esc.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {esc.level.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] font-numeric">
                        {formatDate(esc.escalatedAt, "medium")}
                      </span>
                    </div>
                    {esc.escalatedBy && (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        By: {esc.escalatedBy}
                      </p>
                    )}
                    {esc.note && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                        {esc.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Timeline helper ──────────────────────────────────────────────────────────

function TimelineItem({
  label,
  date,
  sub,
  active = false,
  future = false,
  color = "default",
}: {
  label: string;
  date: Date;
  sub?: string;
  active?: boolean;
  future?: boolean;
  color?: "default" | "amber" | "red" | "green" | "muted";
}) {
  const dotColor =
    color === "green"
      ? "var(--color-status-green)"
      : color === "red"
      ? "var(--color-status-red)"
      : color === "amber"
      ? "var(--color-status-amber)"
      : color === "muted"
      ? "var(--color-slate-300)"
      : active
      ? "var(--color-navy-600)"
      : "var(--color-slate-400)";

  return (
    <li className="ml-4">
      <div
        className="absolute -left-1.5 size-3 rounded-full border-2 border-white"
        style={{ background: dotColor }}
      />
      <p className="text-xs font-medium text-[var(--color-text-primary)]">{label}</p>
      <p
        className={`text-xs font-numeric mt-0.5 ${
          future ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-secondary)]"
        }`}
      >
        {formatDate(date, "medium")}
      </p>
      {sub && (
        <p
          className={`text-xs mt-0.5 ${
            color === "red"
              ? "text-[var(--color-status-red)] font-semibold"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          {sub}
        </p>
      )}
    </li>
  );
}
