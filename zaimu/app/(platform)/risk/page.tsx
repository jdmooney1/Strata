import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ShieldCheck, Clock, AlertTriangle, Calendar } from "lucide-react";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { RunEvaluationButton } from "./run-evaluation-button";
import { AcknowledgeButton } from "./acknowledge-button";

export const metadata: Metadata = { title: "Risk Engine" };
export const dynamic = "force-dynamic";

const SEV_ORDER: Record<string, number> = {
  ESCALATED: 0,
  CRITICAL: 1,
  WARNING: 2,
  INFORMATIONAL: 3,
};

function severityBadge(severity: string) {
  switch (severity) {
    case "ESCALATED":
      return (
        <span className="inline-flex items-center gap-1 badge text-white" style={{ background: "var(--color-status-red)" }}>
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

function categoryBadge(category: string) {
  const labels: Record<string, string> = {
    LEASE: "Lease",
    DEBT: "Debt",
    REPORTING: "Reporting",
    COMPLIANCE: "Compliance",
    TREASURY: "Treasury",
  };
  return (
    <span className="badge badge-navy">{labels[category] ?? category}</span>
  );
}

export default async function RiskPage() {
  const orgId = await getOrgId();

  const [events, summary] = await Promise.all([
    db.riskEvent.findMany({
      where: { orgId, status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] } },
      include: { asset: { select: { id: true, name: true, country: true } } },
      orderBy: [{ firstDetectedAt: "asc" }],
    }),
    db.riskEvent.groupBy({
      by: ["severity"],
      where: { orgId, status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] } },
      _count: { id: true },
    }),
  ]);

  // Sort events by severity order in JS
  events.sort(
    (a, b) =>
      (SEV_ORDER[a.severity] ?? 99) - (SEV_ORDER[b.severity] ?? 99)
  );

  // Compute summary counts
  const countBySev: Record<string, number> = {};
  for (const row of summary) {
    countBySev[row.severity] = row._count.id;
  }
  const criticalCount = countBySev["CRITICAL"] ?? 0;
  const warningCount = countBySev["WARNING"] ?? 0;
  const escalatedCount = countBySev["ESCALATED"] ?? 0;
  const infoCount = countBySev["INFORMATIONAL"] ?? 0;
  const totalOpen = events.length;

  // Unique assets with open events
  const assetsAtRisk = new Set(events.map((e) => e.assetId).filter(Boolean)).size;

  // Latest evaluation time (most recent lastEvaluatedAt)
  const lastEvaluated = events.reduce<Date | null>((max, e) => {
    return !max || e.lastEvaluatedAt > max ? e.lastEvaluatedAt : max;
  }, null);

  // Upcoming deadlines (next 90 days, by dueDate)
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = events
    .filter((e) => e.dueDate && e.dueDate >= now && e.dueDate <= in90Days)
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));

  // Category breakdown
  const categoryOrder = ["LEASE", "DEBT", "REPORTING", "COMPLIANCE", "TREASURY"];
  const countByCategory: Record<string, number> = {};
  for (const e of events) {
    countByCategory[e.category] = (countByCategory[e.category] ?? 0) + 1;
  }
  const maxCategoryCount = Math.max(1, ...Object.values(countByCategory));

  const criticalEvents = events.filter((e) => e.severity === "ESCALATED" || e.severity === "CRITICAL");
  const warningEvents = events.filter((e) => e.severity === "WARNING");
  const infoEvents = events.filter((e) => e.severity === "INFORMATIONAL");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-5 text-[var(--color-navy-600)]" />
            <h1 className="text-xl font-semibold">Operational Risk Engine</h1>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {lastEvaluated
              ? `Last evaluated: ${formatDate(lastEvaluated, "medium")}`
              : "Not yet evaluated"}
            {totalOpen > 0 && ` · ${totalOpen} open risk${totalOpen !== 1 ? "s" : ""}`}
          </p>
        </div>
        <RunEvaluationButton orgId={orgId} variant="header" />
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="data-card p-4">
          <p className="section-label text-[var(--color-status-red)]">Critical</p>
          <p className="text-3xl font-bold font-numeric mt-1 text-[var(--color-status-red)]">
            {criticalCount}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">open issues</p>
        </div>
        <div className="data-card p-4">
          <p className="section-label text-[var(--color-status-amber)]">Warning</p>
          <p className="text-3xl font-bold font-numeric mt-1 text-[var(--color-status-amber)]">
            {warningCount}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">open issues</p>
        </div>
        <div className="data-card p-4">
          <p className="section-label" style={{ color: "var(--color-status-red)" }}>Escalated</p>
          <p className="text-3xl font-bold font-numeric mt-1" style={{ color: "var(--color-status-red)" }}>
            {escalatedCount}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">open issues</p>
        </div>
        <div className="data-card p-4">
          <p className="section-label">Info</p>
          <p className="text-3xl font-bold font-numeric mt-1 text-[var(--color-text-secondary)]">
            {infoCount}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">open issues</p>
        </div>
        <div className="data-card p-4">
          <p className="section-label">Assets at Risk</p>
          <p className="text-3xl font-bold font-numeric mt-1 text-[var(--color-text-primary)]">
            {assetsAtRisk}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">with open events</p>
        </div>
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="data-card py-16 flex flex-col items-center gap-4 text-center">
          <ShieldCheck className="size-12 text-[var(--color-status-green)]" />
          <div>
            <p className="text-base font-semibold text-[var(--color-text-primary)]">
              No risk events detected
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Click "Run Evaluation" to scan all assets for operational risks.
            </p>
          </div>
          <RunEvaluationButton orgId={orgId} variant="cta" />
        </div>
      )}

      {/* Critical / Escalated Events */}
      {criticalEvents.length > 0 && (
        <div className="data-card overflow-hidden">
          <div
            className="data-card-header"
            style={{ borderBottom: "2px solid var(--color-status-red)", background: "var(--color-status-red-bg)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--color-status-red)]" />
              <h2 className="text-sm font-semibold text-[var(--color-status-red)]">
                Critical Issues
              </h2>
            </div>
            <span className="badge badge-red">{criticalEvents.length}</span>
          </div>
          <RiskEventTable events={criticalEvents} />
        </div>
      )}

      {/* Warning Events */}
      {warningEvents.length > 0 && (
        <div className="data-card overflow-hidden">
          <div
            className="data-card-header"
            style={{ borderBottom: "1px solid var(--color-status-amber-bg)", background: "var(--color-status-amber-bg)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--color-status-amber)]" />
              <h2 className="text-sm font-semibold text-[var(--color-status-amber)]">
                Warnings
              </h2>
            </div>
            <span className="badge badge-amber">{warningEvents.length}</span>
          </div>
          <RiskEventTable events={warningEvents} />
        </div>
      )}

      {/* Info Events */}
      {infoEvents.length > 0 && (
        <div className="data-card overflow-hidden">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Informational
            </h2>
            <span className="badge badge-gray">{infoEvents.length}</span>
          </div>
          <RiskEventTable events={infoEvents} />
        </div>
      )}

      {/* Bottom row: Upcoming Deadlines + Category Breakdown */}
      {events.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Upcoming Deadlines */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Upcoming Deadlines</h2>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">Next 90 days</span>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {upcomingDeadlines.length === 0 && (
                <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  No deadlines in the next 90 days
                </p>
              )}
              {upcomingDeadlines.map((e) => {
                const daysUntilDue = e.dueDate
                  ? Math.ceil(
                      (e.dueDate.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;
                const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                return (
                  <div
                    key={e.id}
                    className="px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/risk/${e.id}`}
                        className="text-xs font-medium text-[var(--color-text-primary)] hover:underline truncate block"
                      >
                        {e.title}
                      </Link>
                      {e.asset && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                          {e.asset.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {severityBadge(e.severity)}
                      <span
                        className={`text-xs font-numeric font-semibold ${
                          isOverdue
                            ? "text-[var(--color-status-red)]"
                            : daysUntilDue !== null && daysUntilDue <= 7
                            ? "text-[var(--color-status-amber)]"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {e.dueDate ? formatDate(e.dueDate, "medium") : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="data-card">
            <div className="data-card-header">
              <h2 className="text-sm font-semibold">Category Breakdown</h2>
              <span className="text-xs text-[var(--color-text-muted)]">{totalOpen} total</span>
            </div>
            <div className="data-card-body space-y-3">
              {categoryOrder.map((cat) => {
                const count = countByCategory[cat] ?? 0;
                const pct = Math.round((count / maxCategoryCount) * 100);
                const labels: Record<string, string> = {
                  LEASE: "Lease",
                  DEBT: "Debt",
                  REPORTING: "Reporting",
                  COMPLIANCE: "Compliance",
                  TREASURY: "Treasury",
                };
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">
                        {labels[cat] ?? cat}
                      </span>
                      <span className="text-xs font-numeric text-[var(--color-text-secondary)]">
                        {count}
                      </span>
                    </div>
                    <div
                      className="rounded-full overflow-hidden"
                      style={{
                        height: "6px",
                        background: "var(--color-slate-100)",
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background:
                            count === 0
                              ? "var(--color-slate-200)"
                              : "var(--color-navy-600)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared event table component ─────────────────────────────────────────────

type RiskEventRow = {
  id: string;
  severity: string;
  category: string;
  status: string;
  title: string;
  firstDetectedAt: Date;
  dueDate: Date | null;
  asset: { id: string; name: string; country: string } | null;
};

function RiskEventTable({ events }: { events: RiskEventRow[] }) {
  const now = new Date();
  return (
    <div className="divide-y divide-[var(--color-border)]">
      {events.map((e) => {
        const daysSince = Math.floor(
          (now.getTime() - e.firstDetectedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysUntilDue = e.dueDate
          ? Math.ceil(
              (e.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          : null;
        const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

        return (
          <div
            key={e.id}
            className="px-4 py-3 flex items-center gap-3 table-row-hover"
          >
            {/* Severity + Category */}
            <div className="flex items-center gap-1.5 flex-shrink-0 w-36">
              {severityBadge(e.severity)}
              {categoryBadge(e.category)}
            </div>

            {/* Title + Asset */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/risk/${e.id}`}
                className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-navy-600)] hover:underline truncate block"
              >
                {e.title}
              </Link>
              {e.asset && (
                <Link
                  href={`/assets/${e.asset.id}`}
                  className="text-xs text-[var(--color-text-muted)] hover:underline mt-0.5 block truncate"
                >
                  {e.asset.name}
                </Link>
              )}
            </div>

            {/* Days since detected */}
            <div className="flex-shrink-0 text-right hidden sm:block">
              <p className="text-xs font-numeric text-[var(--color-text-muted)]">
                {daysSince === 0 ? "Today" : `${daysSince}d ago`}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">detected</p>
            </div>

            {/* Due date */}
            <div className="flex-shrink-0 text-right w-24 hidden md:block">
              {e.dueDate ? (
                <>
                  <p
                    className={`text-xs font-numeric font-medium ${
                      isOverdue
                        ? "text-[var(--color-status-red)]"
                        : daysUntilDue !== null && daysUntilDue <= 7
                        ? "text-[var(--color-status-amber)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {formatDate(e.dueDate, "short")}
                  </p>
                  {isOverdue ? (
                    <p className="text-xs text-[var(--color-status-red)]">overdue</p>
                  ) : daysUntilDue !== null ? (
                    <p className="text-xs text-[var(--color-text-muted)]">{daysUntilDue}d left</p>
                  ) : null}
                </>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">No due date</span>
              )}
            </div>

            {/* Acknowledge */}
            <div className="flex-shrink-0">
              <AcknowledgeButton eventId={e.id} status={e.status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
