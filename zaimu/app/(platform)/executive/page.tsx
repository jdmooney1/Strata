import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { formatMillions, formatPercent, formatDate, countryFlag } from "@/lib/utils";

export const metadata: Metadata = { title: "Executive Summary" };
export const dynamic = "force-dynamic";

const ORG_ID = "org_sanyo_001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: string) {
  switch (s) {
    case "ESCALATED": return { text: "ESCALATED", cls: "text-[#991b1b] font-bold" };
    case "CRITICAL":  return { text: "CRITICAL",  cls: "text-[#dc2626] font-bold" };
    case "WARNING":   return { text: "WARNING",   cls: "text-[#d97706] font-semibold" };
    default:          return { text: s,            cls: "text-[var(--color-text-muted)]" };
  }
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function ExecutiveSummaryContent() {
  const [assets, allLoans, riskEvents, activeWorkflows, openAlerts] = await Promise.all([
    db.asset.findMany({
      where: { orgId: ORG_ID },
      include: { loans: { include: { covenants: true } } },
      orderBy: { name: "asc" },
    }),
    db.loan.findMany({ where: { asset: { orgId: ORG_ID } } }),
    db.riskEvent.findMany({
      where: { orgId: ORG_ID, status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] } },
      include: { asset: { select: { id: true, name: true } } },
      orderBy: [{ severity: "asc" }, { firstDetectedAt: "asc" }],
    }),
    db.workflow.findMany({
      where: { orgId: ORG_ID, status: { in: ["ACTIVE", "BLOCKED"] } },
      include: {
        asset: { select: { id: true, name: true } },
        steps: {
          where: { status: { in: ["IN_PROGRESS", "BLOCKED", "OVERDUE"] } },
          orderBy: { stepOrder: "asc" },
          take: 1,
        },
      },
      orderBy: { targetDate: "asc" },
    }),
    db.alert.count({
      where: { asset: { orgId: ORG_ID }, resolved: false, severity: { in: ["CRITICAL", "HIGH"] } },
    }),
  ]);

  const SEV_ORDER: Record<string, number> = { ESCALATED: 0, CRITICAL: 1, WARNING: 2, INFORMATIONAL: 3 };
  const totalDebt  = allLoans.reduce((s, l) => s + Number(l.currentBalance), 0);
  const totalNav   = assets.reduce((s, a) => s + Number(a.currentValuation ?? 0), 0);
  const avgOcc     = assets.filter((a) => a.occupancyRate != null).length
    ? assets.filter((a) => a.occupancyRate != null).reduce((s, a) => s + Number(a.occupancyRate), 0)
      / assets.filter((a) => a.occupancyRate != null).length
    : 0;
  const ltv        = totalNav > 0 ? (totalDebt / totalNav) * 100 : 0;

  const criticalRisks = riskEvents.filter((e) => e.severity === "ESCALATED" || e.severity === "CRITICAL");
  const warningRisks  = riskEvents.filter((e) => e.severity === "WARNING");
  const covenantBreaches = assets.filter((a) => a.covenantStatus === "BREACH").length;
  const blockedWfs = activeWorkflows.filter((w) => w.status === "BLOCKED");

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const in90 = new Date(now.getTime() + 90 * 86400000);

  const urgentRisks = riskEvents
    .filter((e) => e.dueDate && e.dueDate <= in30)
    .sort((a, b) => (SEV_ORDER[a.severity] ?? 99) - (SEV_ORDER[b.severity] ?? 99))
    .slice(0, 5);

  const refiIn90 = assets
    .filter((a) => a.refinancingDate && new Date(a.refinancingDate) <= in90)
    .sort((a, b) => new Date(a.refinancingDate!).getTime() - new Date(b.refinancingDate!).getTime());

  return (
    <div className="max-w-4xl space-y-5">

      {/* ── Document header ─────────────────────────────────────────── */}
      <div
        className="border-b-2 pb-4"
        style={{ borderColor: "var(--color-navy-700)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-[0.625rem] font-bold uppercase tracking-widest mb-1"
              style={{ color: "var(--color-navy-500)" }}
            >
              三洋キャピタルホールディングス — Sanyo Capital Holdings
            </p>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Executive Summary
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Portfolio Operational Status — {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`text-sm font-bold ${
                criticalRisks.length > 0 || covenantBreaches > 0
                  ? "text-[var(--color-status-red)]"
                  : warningRisks.length > 0
                  ? "text-[var(--color-status-amber)]"
                  : "text-[var(--color-status-green)]"
              }`}
            >
              {criticalRisks.length > 0 || covenantBreaches > 0
                ? "AMBER — ACTION REQUIRED"
                : warningRisks.length > 0
                ? "AMBER — MONITORING REQUIRED"
                : "GREEN — NO MATERIAL ISSUES"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Portfolio snapshot ──────────────────────────────────────── */}
      <div className="data-card overflow-hidden">
        <div className="module-header">Portfolio Exposure Snapshot</div>
        <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] sm:grid-cols-4">
          {[
            { label: "Portfolio NAV",  value: formatMillions(totalNav, "USD"),     sub: "Combined asset valuation" },
            { label: "Total Debt",     value: formatMillions(totalDebt, "USD"),    sub: "All facilities combined" },
            { label: "Portfolio LTV",  value: `${ltv.toFixed(1)}%`,               sub: "Debt / NAV" },
            { label: "Avg Occupancy",  value: formatPercent(avgOcc),              sub: `${assets.length} asset${assets.length !== 1 ? "s" : ""}` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="px-4 py-3">
              <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{label}</p>
              <p className="text-xl font-bold font-numeric text-[var(--color-text-primary)]">{value}</p>
              <p className="text-[0.6875rem] text-[var(--color-text-muted)] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Key risks ───────────────────────────────────────────────── */}
      <div className="data-card overflow-hidden">
        <div className="module-header flex items-center justify-between">
          <span>Key Risks</span>
          <Link href="/risk" className="text-xs text-[var(--color-text-link)] hover:underline font-normal">
            Full risk register →
          </Link>
        </div>

        {riskEvents.length === 0 ? (
          <p className="px-4 py-4 text-xs text-[var(--color-status-green)]">
            No open risk events — portfolio is operationally clear.
          </p>
        ) : (
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: "3.5rem" }}>Sev.</th>
                <th className="text-left">Risk Item</th>
                <th className="text-left">Asset</th>
                <th className="text-right">Action Required</th>
              </tr>
            </thead>
            <tbody>
              {[...criticalRisks, ...warningRisks.slice(0, 3)].map((e) => {
                const { text, cls } = statusLabel(e.severity);
                const daysLeft = e.dueDate
                  ? Math.ceil((e.dueDate.getTime() - now.getTime()) / 86400000)
                  : null;
                return (
                  <tr key={e.id}>
                    <td><span className={`text-xs font-mono ${cls}`}>{text}</span></td>
                    <td>
                      <Link href={`/risk/${e.id}`} className="text-xs font-medium hover:underline">
                        {e.title}
                      </Link>
                    </td>
                    <td>
                      <span className="text-xs text-[var(--color-text-muted)]">{e.asset?.name ?? "—"}</span>
                    </td>
                    <td className="text-right">
                      {daysLeft !== null ? (
                        <span className={`text-xs font-numeric font-semibold ${
                          daysLeft < 0 ? "text-[var(--color-status-red)]" :
                          daysLeft <= 14 ? "text-[var(--color-status-amber)]" :
                          "text-[var(--color-text-muted)]"
                        }`}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `Due in ${daysLeft}d`}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">No deadline set</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Urgent actions ──────────────────────────────────────────── */}
      {urgentRisks.length > 0 && (
        <div className="data-card overflow-hidden">
          <div className="module-header" style={{ background: "#fef9ec", borderColor: "#fde68a" }}>
            Urgent Actions — Due Within 30 Days
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {urgentRisks.map((e, i) => {
              const daysLeft = e.dueDate
                ? Math.ceil((e.dueDate.getTime() - now.getTime()) / 86400000)
                : null;
              return (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-xs font-mono text-[var(--color-text-muted)] flex-shrink-0 mt-0.5 w-4">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{e.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{e.asset?.name ?? "Portfolio"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-sm font-bold font-numeric ${
                      daysLeft !== null && daysLeft <= 7
                        ? "text-[var(--color-status-red)]"
                        : "text-[var(--color-status-amber)]"
                    }`}>
                      {daysLeft !== null && daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` :
                       daysLeft !== null ? `${daysLeft}d remaining` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active workflows ────────────────────────────────────────── */}
      {activeWorkflows.length > 0 && (
        <div className="data-card overflow-hidden">
          <div className="module-header flex items-center justify-between">
            <span>Active Operational Workflows</span>
            <Link href="/workflows" className="text-xs text-[var(--color-text-link)] hover:underline font-normal">
              View all →
            </Link>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Workflow</th>
                <th className="text-left">Asset</th>
                <th className="text-left">Current Step</th>
                <th className="text-right">Target</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeWorkflows.map((wf) => {
                const monthsLeft = wf.targetDate
                  ? Math.ceil((wf.targetDate.getTime() - now.getTime()) / (30 * 86400000))
                  : null;
                return (
                  <tr key={wf.id}>
                    <td>
                      <Link href={`/workflows/${wf.id}`} className="text-xs font-medium hover:underline">
                        {wf.title}
                      </Link>
                    </td>
                    <td>
                      <span className="text-xs text-[var(--color-text-muted)]">{wf.asset.name}</span>
                    </td>
                    <td>
                      <span className="text-xs text-[var(--color-text-muted)] truncate block max-w-[140px]">
                        {wf.steps[0]?.name ?? "—"}
                      </span>
                    </td>
                    <td className="text-right">
                      {wf.targetDate ? (
                        <span className={`text-xs font-numeric ${
                          monthsLeft !== null && monthsLeft <= 1
                            ? "text-[var(--color-status-amber)] font-semibold"
                            : "text-[var(--color-text-muted)]"
                        }`}>
                          {formatDate(wf.targetDate.toISOString(), "short")}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${wf.status === "BLOCKED" ? "badge-red" : "badge-navy"}`}>
                        {wf.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Refinancing obligations ─────────────────────────────────── */}
      {refiIn90.length > 0 && (
        <div className="data-card overflow-hidden">
          <div className="module-header">Refinancing Obligations — Next 90 Days</div>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Asset</th>
                <th className="text-right">Maturity</th>
                <th className="text-right">Months</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {refiIn90.map((asset) => {
                const months = Math.ceil(
                  (new Date(asset.refinancingDate!).getTime() - now.getTime()) / (30 * 86400000)
                );
                const activeRefiWf = activeWorkflows.find(
                  (w) => w.assetId === asset.id && w.workflowType === "REFINANCING"
                );
                return (
                  <tr key={asset.id}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">{countryFlag(asset.country)}</span>
                        <Link href={`/assets/${asset.id}`} className="text-xs font-medium hover:underline">
                          {asset.name}
                        </Link>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className={`text-xs font-numeric font-semibold ${
                        months <= 6
                          ? "text-[var(--color-status-red)]"
                          : months <= 12
                          ? "text-[var(--color-status-amber)]"
                          : "text-[var(--color-status-green)]"
                      }`}>
                        {formatDate(asset.refinancingDate, "short")}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={`text-xs font-numeric ${
                        months <= 6 ? "text-[var(--color-status-red)] font-semibold" : "text-[var(--color-text-muted)]"
                      }`}>
                        {months}mo
                      </span>
                    </td>
                    <td>
                      {activeRefiWf ? (
                        <Link href={`/workflows/${activeRefiWf.id}`} className="text-xs text-[var(--color-navy-600)] hover:underline">
                          Workflow active
                        </Link>
                      ) : (
                        <Link href="/workflows/new" className="text-xs text-[var(--color-status-amber)] hover:underline">
                          No workflow — initiate
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer note ─────────────────────────────────────────────── */}
      <div className="border-t border-[var(--color-border)] pt-3">
        <p className="text-[0.625rem] text-[var(--color-text-muted)]">
          Generated from live operational data. All figures in reporting currency unless noted.
          This summary is for internal management use only — not for distribution.
          Return to <Link href="/dashboard" className="hover:underline text-[var(--color-text-link)]">Command Centre</Link>.
        </p>
      </div>
    </div>
  );
}

function ExecutiveSummaryLoading() {
  return (
    <div className="space-y-4 animate-pulse max-w-4xl">
      <div className="h-16 bg-[var(--color-slate-100)] rounded" />
      <div className="h-24 bg-[var(--color-slate-100)] rounded" />
      <div className="h-48 bg-[var(--color-slate-100)] rounded" />
      <div className="h-32 bg-[var(--color-slate-100)] rounded" />
    </div>
  );
}

export default function ExecutiveSummaryPage() {
  return (
    <Suspense fallback={<ExecutiveSummaryLoading />}>
      <ExecutiveSummaryContent />
    </Suspense>
  );
}
