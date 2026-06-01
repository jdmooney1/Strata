import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { RunEvaluationButton } from "./run-evaluation-button";
import { AcknowledgeButton } from "./acknowledge-button";

export const metadata: Metadata = { title: "Risk Monitor" };
export const dynamic = "force-dynamic";

const SEV_ORDER: Record<string, number> = {
  ESCALATED: 0,
  CRITICAL: 1,
  WARNING: 2,
  INFORMATIONAL: 3,
};

const SEV_LEFT_BORDER: Record<string, string> = {
  ESCALATED: "border-l-[3px] border-l-[#991b1b]",
  CRITICAL:  "border-l-[3px] border-l-[#dc2626]",
  WARNING:   "border-l-[3px] border-l-[#d97706]",
  INFORMATIONAL: "border-l-[3px] border-l-[#9ca3af]",
};

const SEV_CODE_CLASS: Record<string, string> = {
  ESCALATED: "text-[#991b1b] font-bold",
  CRITICAL:  "text-[#dc2626] font-bold",
  WARNING:   "text-[#d97706] font-semibold",
  INFORMATIONAL: "text-[var(--color-text-muted)]",
};

const SEV_ABBR: Record<string, string> = {
  ESCALATED: "ESC",
  CRITICAL:  "CRIT",
  WARNING:   "WARN",
  INFORMATIONAL: "INFO",
};

const CAT_LABELS: Record<string, string> = {
  LEASE:         "Lease",
  DEBT:          "Debt",
  REPORTING:     "Reporting",
  COMPLIANCE:    "Compliance",
  TREASURY:      "Treasury",
};

export default async function RiskPage() {
  const orgId = await getOrgId();

  const [events, groupedSeverity, groupedCategory] = await Promise.all([
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
    db.riskEvent.groupBy({
      by: ["category"],
      where: { orgId, status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] } },
      _count: { id: true },
    }),
  ]);

  events.sort((a, b) => (SEV_ORDER[a.severity] ?? 99) - (SEV_ORDER[b.severity] ?? 99));

  const countBySev: Record<string, number> = {};
  for (const row of groupedSeverity) countBySev[row.severity] = row._count.id;
  const countByCat: Record<string, number> = {};
  for (const row of groupedCategory) countByCat[row.category] = row._count.id;

  const escalatedCount  = countBySev["ESCALATED"]    ?? 0;
  const criticalCount   = countBySev["CRITICAL"]      ?? 0;
  const warningCount    = countBySev["WARNING"]        ?? 0;
  const infoCount       = countBySev["INFORMATIONAL"] ?? 0;
  const totalOpen       = events.length;
  const assetsAtRisk    = new Set(events.map((e) => e.assetId).filter(Boolean)).size;

  const lastEvaluated = events.reduce<Date | null>((max, e) => {
    return !max || e.lastEvaluatedAt > max ? e.lastEvaluatedAt : max;
  }, null);

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = events
    .filter((e) => e.dueDate && e.dueDate >= now && e.dueDate <= in90Days)
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0));

  return (
    <div className="space-y-4">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Risk Monitor</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {lastEvaluated ? `Evaluated ${formatDate(lastEvaluated, "medium")}` : "Not yet evaluated"}
            {" · "}{totalOpen} open · {assetsAtRisk} asset{assetsAtRisk !== 1 ? "s" : ""} at risk
          </p>
        </div>
        <RunEvaluationButton orgId={orgId} variant="header" />
      </div>

      {/* ── Operational Status Bar ─────────────────────────────────── */}
      <div className="status-bar">
        <div className={`status-bar-item ${escalatedCount > 0 ? "alert" : "ok"}`}>
          ESCALATED <span className="status-bar-item value">{escalatedCount}</span>
        </div>
        <div className={`status-bar-item ${criticalCount > 0 ? "alert" : "ok"}`}>
          CRITICAL <span className="status-bar-item value">{criticalCount}</span>
        </div>
        <div className={`status-bar-item ${warningCount > 0 ? "warn" : "ok"}`}>
          WARNING <span className="status-bar-item value">{warningCount}</span>
        </div>
        <div className="status-bar-item ok">
          INFORMATIONAL <span className="status-bar-item value">{infoCount}</span>
        </div>
        <div className="status-bar-item ok">
          ASSETS AT RISK <span className="status-bar-item value">{assetsAtRisk}</span>
        </div>
        {upcomingDeadlines.length > 0 && (
          <div className="status-bar-item warn">
            DEADLINES 90D <span className="status-bar-item value">{upcomingDeadlines.length}</span>
          </div>
        )}
      </div>

      {/* ── Category distribution (compact inline) ────────────────── */}
      {totalOpen > 0 && (
        <div className="data-card overflow-hidden">
          <div className="module-header">Category Distribution</div>
          <div className="flex divide-x divide-[var(--color-border)]">
            {["LEASE","DEBT","REPORTING","COMPLIANCE","TREASURY"].map((cat) => {
              const count = countByCat[cat] ?? 0;
              return (
                <div key={cat} className="flex-1 px-3 py-2 text-center">
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">
                    {CAT_LABELS[cat] ?? cat}
                  </p>
                  <p className={`text-lg font-bold font-numeric ${count > 0 ? "text-[var(--color-text-primary)]" : "text-[var(--color-slate-300)]"}`}>
                    {count}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────── */}
      {events.length === 0 && (
        <div className="data-card py-12 flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-semibold text-[var(--color-status-green)]">No risk events detected</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Run an evaluation to scan all assets for operational risks.
          </p>
          <RunEvaluationButton orgId={orgId} variant="cta" />
        </div>
      )}

      {/* ── Main risk table ─────────────────────────────────────────── */}
      {events.length > 0 && (
        <div className="data-card overflow-hidden">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: "3rem" }}>SEV</th>
                <th className="text-left" style={{ width: "4.5rem" }}>CAT</th>
                <th className="text-left" style={{ width: "7rem" }}>Asset</th>
                <th className="text-left">Issue</th>
                <th className="text-right" style={{ width: "5.5rem" }}>Detected</th>
                <th className="text-right" style={{ width: "6rem" }}>Due Date</th>
                <th className="text-right" style={{ width: "5rem" }}>Status</th>
                <th className="text-right" style={{ width: "6rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const daysSince = Math.floor(
                  (now.getTime() - e.firstDetectedAt.getTime()) / 86400000
                );
                const daysUntilDue = e.dueDate
                  ? Math.ceil((e.dueDate.getTime() - now.getTime()) / 86400000)
                  : null;
                const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

                return (
                  <tr key={e.id} className={SEV_LEFT_BORDER[e.severity] ?? ""}>
                    <td>
                      <span className={`text-xs font-mono ${SEV_CODE_CLASS[e.severity] ?? "text-[var(--color-text-muted)]"}`}>
                        {SEV_ABBR[e.severity] ?? e.severity}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-navy">{CAT_LABELS[e.category] ?? e.category}</span>
                    </td>
                    <td>
                      {e.asset ? (
                        <Link href={`/assets/${e.asset.id}`} className="text-xs font-medium hover:underline truncate block">
                          {e.asset.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/risk/${e.id}`}
                        className="text-xs hover:underline hover:text-[var(--color-navy-700)] truncate block"
                      >
                        {e.title}
                      </Link>
                    </td>
                    <td className="text-right">
                      <span className="text-xs font-numeric text-[var(--color-text-muted)]">
                        {daysSince === 0 ? "Today" : `${daysSince}d`}
                      </span>
                    </td>
                    <td className="text-right">
                      {e.dueDate ? (
                        <span className={`text-xs font-numeric font-medium ${
                          isOverdue
                            ? "text-[var(--color-status-red)]"
                            : daysUntilDue !== null && daysUntilDue <= 7
                            ? "text-[var(--color-status-amber)]"
                            : "text-[var(--color-text-secondary)]"
                        }`}>
                          {isOverdue
                            ? `${Math.abs(daysUntilDue!)}d over`
                            : formatDate(e.dueDate, "short")}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <span className={`text-xs ${
                        e.status === "ESCALATED"
                          ? "text-[var(--color-status-red)] font-semibold"
                          : e.status === "ACKNOWLEDGED"
                          ? "text-[var(--color-text-muted)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}>
                        {e.status === "ACKNOWLEDGED" ? "ACK" : e.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <AcknowledgeButton eventId={e.id} status={e.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Upcoming Deadlines ─────────────────────────────────────── */}
      {upcomingDeadlines.length > 0 && (
        <div className="data-card overflow-hidden">
          <div className="module-header flex items-center justify-between">
            <span>Upcoming Deadlines</span>
            <span className="font-normal text-[var(--color-text-muted)]">Next 90 days — {upcomingDeadlines.length} item{upcomingDeadlines.length !== 1 ? "s" : ""}</span>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Issue</th>
                <th className="text-left">Asset</th>
                <th className="text-right">Due Date</th>
                <th className="text-right">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {upcomingDeadlines.map((e) => {
                const daysLeft = e.dueDate
                  ? Math.ceil((e.dueDate.getTime() - now.getTime()) / 86400000)
                  : null;
                return (
                  <tr key={e.id} className={SEV_LEFT_BORDER[e.severity] ?? ""}>
                    <td>
                      <Link href={`/risk/${e.id}`} className="text-xs font-medium hover:underline">
                        {e.title}
                      </Link>
                    </td>
                    <td>
                      <span className="text-xs text-[var(--color-text-muted)]">{e.asset?.name ?? "—"}</span>
                    </td>
                    <td className="text-right">
                      <span className="text-xs font-numeric">{e.dueDate ? formatDate(e.dueDate, "short") : "—"}</span>
                    </td>
                    <td className="text-right">
                      <span className={`text-xs font-numeric font-semibold ${
                        daysLeft !== null && daysLeft <= 7
                          ? "text-[var(--color-status-red)]"
                          : daysLeft !== null && daysLeft <= 30
                          ? "text-[var(--color-status-amber)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}>
                        {daysLeft !== null ? `${daysLeft}d` : "—"}
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
  );
}
