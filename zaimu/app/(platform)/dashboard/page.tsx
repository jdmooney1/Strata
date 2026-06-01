import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  formatMillions,
  formatPercent,
  formatDate,
  covenantBadgeClass,
  covenantLabel,
  assetTypeLabel,
  scoreClass,
  countryFlag,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Command Centre" };
export const dynamic = "force-dynamic";

const ORG_ID = "org_sanyo_001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sevLabel(s: string) {
  switch (s) {
    case "ESCALATED": return "ESC";
    case "CRITICAL":  return "CRIT";
    case "WARNING":   return "WARN";
    default:          return s.slice(0, 4).toUpperCase();
  }
}

function sevClass(s: string) {
  switch (s) {
    case "ESCALATED": return "sev-escalated";
    case "CRITICAL":  return "sev-critical";
    case "WARNING":   return "sev-warning";
    default:          return "sev-info";
  }
}

function sevTextClass(s: string) {
  switch (s) {
    case "ESCALATED":
    case "CRITICAL": return "text-[var(--color-status-red)] font-bold";
    case "WARNING":  return "text-[var(--color-status-amber)] font-semibold";
    default:         return "text-[var(--color-text-muted)]";
  }
}

// ─── Main content ─────────────────────────────────────────────────────────────

async function DashboardContent() {
  const [
    assets,
    allLoans,
    alerts,
    tasks,
    fxRates,
    riskEvents,
    activeWorkflows,
    allRiskCount,
  ] = await Promise.all([
    db.asset.findMany({
      where: { orgId: ORG_ID },
      include: { loans: { include: { covenants: true } } },
    }),
    db.loan.findMany({ where: { asset: { orgId: ORG_ID } } }),
    db.alert.findMany({
      where: { asset: { orgId: ORG_ID }, resolved: false },
      orderBy: { triggeredAt: "desc" },
      take: 20,
    }),
    db.task.findMany({
      where: { orgId: ORG_ID, status: { notIn: ["COMPLETE", "CANCELLED"] } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    db.fxRate.findMany({
      where: { orgId: ORG_ID },
      orderBy: { rateDate: "desc" },
      take: 20,
    }),
    db.riskEvent.findMany({
      where: {
        orgId: ORG_ID,
        status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] },
      },
      include: { asset: { select: { id: true, name: true, country: true } } },
      orderBy: [{ severity: "asc" }, { firstDetectedAt: "asc" }],
      take: 50,
    }),
    db.workflow.findMany({
      where: { orgId: ORG_ID, status: { in: ["ACTIVE", "BLOCKED"] } },
      include: {
        asset: { select: { id: true, name: true } },
        steps: {
          where: { status: { in: ["IN_PROGRESS", "BLOCKED", "OVERDUE", "PENDING_APPROVAL"] } },
          select: { id: true, name: true, status: true, dueDate: true },
          orderBy: { stepOrder: "asc" },
          take: 1,
        },
      },
      orderBy: { targetDate: "asc" },
      take: 10,
    }),
    db.riskEvent.count({
      where: { orgId: ORG_ID, status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] } },
    }),
  ]);

  // ── Computed metrics ──────────────────────────────────────────────────────
  const SEV_ORDER: Record<string, number> = { ESCALATED: 0, CRITICAL: 1, WARNING: 2, INFORMATIONAL: 3 };
  const sortedRisk = [...riskEvents].sort(
    (a, b) => (SEV_ORDER[a.severity] ?? 99) - (SEV_ORDER[b.severity] ?? 99)
  );

  const criticalRisk   = riskEvents.filter((e) => e.severity === "CRITICAL" || e.severity === "ESCALATED");
  const warningRisk    = riskEvents.filter((e) => e.severity === "WARNING");
  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH");
  const blockedWfs     = activeWorkflows.filter((w) => w.status === "BLOCKED");

  const covenantBreaches = assets.filter((a) => a.covenantStatus === "BREACH").length;
  const overdueTaskCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  const totalDebt = allLoans.reduce((s, l) => s + Number(l.currentBalance), 0);
  const assetsWithOcc = assets.filter((a) => a.occupancyRate != null);
  const avgOccupancy = assetsWithOcc.length
    ? assetsWithOcc.reduce((s, a) => s + Number(a.occupancyRate), 0) / assetsWithOcc.length
    : 0;

  // Unique FX pairs
  const fxSeen = new Set<string>();
  const latestFx = fxRates.filter((r) => {
    const k = `${r.baseCurrency}/${r.quoteCurrency}`;
    if (fxSeen.has(k)) return false;
    fxSeen.add(k); return true;
  });

  // Upcoming obligations: refinancing dates within 24 months
  const now = new Date();
  const in24mo = new Date(now.getTime() + 24 * 30 * 24 * 60 * 60 * 1000);
  const upcomingRefi = assets
    .filter((a) => a.refinancingDate && new Date(a.refinancingDate) <= in24mo)
    .sort((a, b) => new Date(a.refinancingDate!).getTime() - new Date(b.refinancingDate!).getTime());

  // Priority items for operational queue: critical risks + overdue tasks + blocked workflows
  type PriorityItem =
    | { kind: "risk";     id: string; severity: string; asset: string; assetId: string; title: string; dueDate: Date | null; since: Date }
    | { kind: "task";     id: string; priority: string; asset: string; assetId: string | null; title: string; dueDate: Date | null }
    | { kind: "workflow"; id: string; asset: string; assetId: string; title: string; step: string | null; targetDate: Date | null };

  const priorityItems: PriorityItem[] = [];
  for (const e of criticalRisk) {
    priorityItems.push({
      kind: "risk",
      id: e.id,
      severity: e.severity,
      asset: e.asset?.name ?? "—",
      assetId: e.assetId ?? "",
      title: e.title,
      dueDate: e.dueDate,
      since: e.firstDetectedAt,
    });
  }
  for (const t of tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).slice(0, 5)) {
    priorityItems.push({
      kind: "task",
      id: t.id,
      priority: t.priority,
      asset: "Portfolio",
      assetId: t.assetId ?? null,
      title: t.title,
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
    });
  }
  for (const w of blockedWfs) {
    priorityItems.push({
      kind: "workflow",
      id: w.id,
      asset: w.asset.name,
      assetId: w.asset.id,
      title: w.title,
      step: w.steps[0]?.name ?? null,
      targetDate: w.targetDate,
    });
  }

  const reportsDue = 0; // placeholder — would query reports in DRAFT status

  return (
    <div className="space-y-0">

      {/* ── Operational Status Bar ─────────────────────────────────────── */}
      <div className="status-bar mb-4">
        <div className={`status-bar-item ${criticalRisk.length > 0 ? "alert" : "ok"}`}>
          CRITICAL RISKS
          <span className="status-bar-item value">{criticalRisk.length}</span>
        </div>
        <div className={`status-bar-item ${warningRisk.length > 0 ? "warn" : "ok"}`}>
          WARNINGS
          <span className="status-bar-item value">{warningRisk.length}</span>
        </div>
        <div className={`status-bar-item ${criticalAlerts.length > 0 ? "alert" : "ok"}`}>
          CRITICAL ALERTS
          <span className="status-bar-item value">{criticalAlerts.length}</span>
        </div>
        <div className={`status-bar-item ${covenantBreaches > 0 ? "alert" : "ok"}`}>
          COVENANT
          <span className="status-bar-item value">{covenantBreaches > 0 ? `${covenantBreaches} BREACH` : "OK"}</span>
        </div>
        <div className={`status-bar-item ${blockedWfs.length > 0 ? "warn" : "ok"}`}>
          WORKFLOWS BLOCKED
          <span className="status-bar-item value">{blockedWfs.length}</span>
        </div>
        <div className={`status-bar-item ${overdueTaskCount > 0 ? "warn" : "ok"}`}>
          OVERDUE TASKS
          <span className="status-bar-item value">{overdueTaskCount}</span>
        </div>
      </div>

      {/* ── Portfolio Assessment ───────────────────────────────────────── */}
      <div className="ai-insight mb-4">
        <p className="ai-insight-label">Portfolio Assessment — 2026年6月</p>
        <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
          Portfolio performance remains broadly stable with{" "}
          <strong>{criticalRisk.length} material risk item{criticalRisk.length !== 1 ? "s" : ""}</strong>{" "}
          requiring attention. Lease expiry at Meridian Advisory Group (88 days elapsed, tenant
          in holdover) represents the highest urgency operational item — renewal workflow is active.
          No valuation on record creates lender reporting exposure; CBRE engagement should be
          initiated this quarter. {covenantBreaches > 0
            ? `${covenantBreaches} covenant breach${covenantBreaches > 1 ? "es" : ""} require${covenantBreaches === 1 ? "s" : ""} immediate lender notification.`
            : "No covenant breaches reported."}{" "}
          Refinancing workflow is in progress with {upcomingRefi.length} maturity
          {upcomingRefi.length !== 1 ? "ies" : "y"} due within 24 months.
        </p>
      </div>

      {/* ── Priority Operational Queue ────────────────────────────────── */}
      {priorityItems.length > 0 && (
        <div className="data-card mb-4 overflow-hidden">
          <div className="module-header flex items-center justify-between">
            <span>Priority Operational Queue</span>
            <span className="text-[var(--color-text-muted)] font-normal">{priorityItems.length} item{priorityItems.length !== 1 ? "s" : ""} requiring action</span>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left" style={{ width: "3.5rem" }}>SEV</th>
                <th className="text-left" style={{ width: "5rem" }}>TYPE</th>
                <th className="text-left">Asset</th>
                <th className="text-left">Issue</th>
                <th className="text-right" style={{ width: "7rem" }}>Due / Since</th>
                <th className="text-right" style={{ width: "5rem" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {priorityItems.map((item) => {
                if (item.kind === "risk") {
                  const daysAgo = Math.floor((now.getTime() - item.since.getTime()) / 86400000);
                  const overdue = item.dueDate && item.dueDate < now;
                  return (
                    <tr key={`r-${item.id}`} className={`${sevClass(item.severity)}`}>
                      <td>
                        <span className={`text-xs font-mono font-bold ${sevTextClass(item.severity)}`}>
                          {sevLabel(item.severity)}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-red" style={{ fontSize: "0.5625rem" }}>RISK</span>
                      </td>
                      <td>
                        <Link href={`/assets/${item.assetId}`} className="text-xs font-medium hover:underline truncate block">
                          {item.asset}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/risk/${item.id}`} className="text-xs hover:underline hover:text-[var(--color-navy-700)] truncate block">
                          {item.title}
                        </Link>
                      </td>
                      <td className="text-right">
                        {item.dueDate ? (
                          <span className={`text-xs font-numeric ${overdue ? "text-[var(--color-status-red)] font-semibold" : "text-[var(--color-text-muted)]"}`}>
                            {overdue ? "OVERDUE" : formatDate(item.dueDate, "short")}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">{daysAgo}d ago</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Link href={`/risk/${item.id}`} className="text-xs text-[var(--color-navy-600)] hover:underline">View →</Link>
                      </td>
                    </tr>
                  );
                }
                if (item.kind === "task") {
                  const overdue = item.dueDate && item.dueDate < now;
                  return (
                    <tr key={`t-${item.id}`} className="sev-warning">
                      <td>
                        <span className="text-xs font-mono font-semibold text-[var(--color-status-amber)]">OVR</span>
                      </td>
                      <td>
                        <span className="badge badge-amber" style={{ fontSize: "0.5625rem" }}>TASK</span>
                      </td>
                      <td>
                        <span className="text-xs text-[var(--color-text-muted)]">{item.asset}</span>
                      </td>
                      <td>
                        <Link href="/tasks" className="text-xs hover:underline hover:text-[var(--color-navy-700)] truncate block">
                          {item.title}
                        </Link>
                      </td>
                      <td className="text-right">
                        <span className={`text-xs font-numeric ${overdue ? "text-[var(--color-status-red)] font-semibold" : "text-[var(--color-text-muted)]"}`}>
                          {item.dueDate ? formatDate(item.dueDate, "short") : "—"}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link href="/tasks" className="text-xs text-[var(--color-navy-600)] hover:underline">View →</Link>
                      </td>
                    </tr>
                  );
                }
                if (item.kind === "workflow") {
                  return (
                    <tr key={`w-${item.id}`} className="sev-escalated">
                      <td>
                        <span className="text-xs font-mono font-bold text-[var(--color-status-red)]">BLK</span>
                      </td>
                      <td>
                        <span className="badge badge-red" style={{ fontSize: "0.5625rem" }}>WF</span>
                      </td>
                      <td>
                        <Link href={`/assets/${item.assetId}`} className="text-xs font-medium hover:underline truncate block">
                          {item.asset}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/workflows/${item.id}`} className="text-xs hover:underline hover:text-[var(--color-navy-700)] truncate block">
                          {item.title}
                          {item.step && <span className="text-[var(--color-text-muted)]"> ↳ {item.step}</span>}
                        </Link>
                      </td>
                      <td className="text-right">
                        <span className="text-xs text-[var(--color-status-red)] font-semibold">BLOCKED</span>
                      </td>
                      <td className="text-right">
                        <Link href={`/workflows/${item.id}`} className="text-xs text-[var(--color-navy-600)] hover:underline">View →</Link>
                      </td>
                    </tr>
                  );
                }
                return null;
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Portfolio Matrix + Obligations ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">

        {/* Portfolio matrix — 2/3 width */}
        <div className="lg:col-span-2 data-card overflow-hidden">
          <div className="module-header flex items-center justify-between">
            <span>Portfolio Matrix</span>
            <Link href="/assets" className="text-xs text-[var(--color-text-link)] hover:underline flex items-center gap-1 font-normal">
              All Assets <ArrowRight className="size-3" />
            </Link>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Asset</th>
                <th className="text-left">Type</th>
                <th className="text-right">Valuation</th>
                <th className="text-right">Occ.</th>
                <th className="text-right">Debt</th>
                <th className="text-center">Covenant</th>
                <th className="text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const loan = asset.loans[0] ?? null;
                return (
                  <tr key={asset.id}>
                    <td>
                      <Link href={`/assets/${asset.id}`} className="hover:underline">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm leading-none flex-shrink-0">{countryFlag(asset.country)}</span>
                          <div>
                            <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-tight hover:text-[var(--color-navy-700)]">
                              {asset.name}
                            </p>
                            <p className="text-[0.625rem] text-[var(--color-text-muted)] leading-tight">{asset.city}</p>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className="text-[0.6875rem] text-[var(--color-text-muted)]">{assetTypeLabel(asset.assetType)}</span>
                    </td>
                    <td className="text-right font-numeric">
                      <span className="text-xs font-medium">
                        {formatMillions(Number(asset.currentValuation ?? 0), asset.currency)}
                      </span>
                      <span className="block text-[0.5625rem] text-[var(--color-text-muted)]">{asset.currency}</span>
                    </td>
                    <td className="text-right font-numeric">
                      <span className={`text-xs font-semibold ${
                        Number(asset.occupancyRate ?? 0) >= 90
                          ? "text-[var(--color-status-green)]"
                          : Number(asset.occupancyRate ?? 0) >= 75
                          ? "text-[var(--color-status-amber)]"
                          : "text-[var(--color-status-red)]"
                      }`}>
                        {asset.occupancyRate != null ? formatPercent(Number(asset.occupancyRate)) : "—"}
                      </span>
                    </td>
                    <td className="text-right font-numeric">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {loan ? formatMillions(Number(loan.currentBalance), loan.currency) : "—"}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${covenantBadgeClass(asset.covenantStatus)}`}>
                        {covenantLabel(asset.covenantStatus)}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`score-ring ${scoreClass(asset.operationalScore)}`}>
                        {asset.operationalScore ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-xs text-[var(--color-text-muted)]">
                    No assets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Obligations calendar — 1/3 width */}
        <div className="data-card overflow-hidden">
          <div className="module-header">Upcoming Obligations</div>

          {/* Refinancing dates */}
          {upcomingRefi.length > 0 && (
            <>
              <div className="px-3 py-1.5 border-b border-[var(--color-border)]">
                <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Refinancing</p>
              </div>
              {upcomingRefi.map((asset) => {
                const date = new Date(asset.refinancingDate!);
                const monthsUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
                const urgency = monthsUntil <= 12
                  ? "text-[var(--color-status-red)] font-semibold"
                  : monthsUntil <= 18
                  ? "text-[var(--color-status-amber)] font-medium"
                  : "text-[var(--color-status-green)]";
                return (
                  <div key={asset.id} className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] last:border-0 table-row-hover">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs leading-none flex-shrink-0">{countryFlag(asset.country)}</span>
                      <Link href={`/assets/${asset.id}`} className="text-xs font-medium truncate hover:underline">
                        {asset.name}
                      </Link>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={`text-xs font-numeric ${urgency}`}>
                        {formatDate(asset.refinancingDate, "short")}
                      </p>
                      <p className={`text-[0.5625rem] ${urgency}`}>{monthsUntil}mo</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Risk events with due dates */}
          {sortedRisk.filter((e) => e.dueDate && e.dueDate >= now).slice(0, 4).map((e) => {
            const daysLeft = Math.ceil((e.dueDate!.getTime() - now.getTime()) / 86400000);
            return (
              <div key={e.id} className={`flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] last:border-0 table-row-hover ${sevClass(e.severity)}`}>
                <div className="flex-1 min-w-0">
                  <Link href={`/risk/${e.id}`} className="text-xs font-medium truncate block hover:underline">
                    {e.title}
                  </Link>
                  <p className="text-[0.5625rem] text-[var(--color-text-muted)]">{e.asset?.name}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className={`text-xs font-numeric font-semibold ${daysLeft <= 7 ? "text-[var(--color-status-red)]" : "text-[var(--color-status-amber)]"}`}>
                    {daysLeft}d
                  </p>
                </div>
              </div>
            );
          })}

          {upcomingRefi.length === 0 && sortedRisk.filter((e) => e.dueDate && e.dueDate >= now).length === 0 && (
            <p className="px-3 py-4 text-xs text-[var(--color-text-muted)]">No upcoming obligations</p>
          )}
        </div>
      </div>

      {/* ── FX Monitor + Active Workflows ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* FX Monitor */}
        <div className="data-card overflow-hidden">
          <div className="module-header flex items-center justify-between">
            <span>FX Monitor</span>
            <Link href="/treasury" className="text-xs text-[var(--color-text-link)] hover:underline font-normal">Treasury →</Link>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Pair</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Date</th>
                <th className="text-right">Source</th>
              </tr>
            </thead>
            <tbody>
              {latestFx.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="font-mono text-xs font-semibold">{r.baseCurrency}/{r.quoteCurrency}</span>
                  </td>
                  <td className="text-right font-numeric">
                    <span className="text-xs font-medium">{Number(r.rate).toFixed(4)}</span>
                  </td>
                  <td className="text-right">
                    <span className="text-xs text-[var(--color-text-muted)]">{formatDate(r.rateDate, "short")}</span>
                  </td>
                  <td className="text-right">
                    <span className="text-xs text-[var(--color-text-muted)]">{r.source}</span>
                  </td>
                </tr>
              ))}
              {latestFx.length === 0 && (
                <tr><td colSpan={4} className="text-center text-xs text-[var(--color-text-muted)]">No FX rates recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Active Workflows */}
        <div className="data-card overflow-hidden">
          <div className="module-header flex items-center justify-between">
            <span>Active Workflows</span>
            <Link href="/workflows" className="text-xs text-[var(--color-text-link)] hover:underline font-normal">
              View all →
            </Link>
          </div>
          {activeWorkflows.length === 0 ? (
            <p className="px-3 py-4 text-xs text-[var(--color-text-muted)]">No active workflows</p>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">Workflow</th>
                  <th className="text-left">Asset</th>
                  <th className="text-left">Current Step</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeWorkflows.map((wf) => (
                  <tr key={wf.id}>
                    <td>
                      <Link href={`/workflows/${wf.id}`} className="text-xs font-medium hover:underline truncate block max-w-[140px]">
                        {wf.title}
                      </Link>
                    </td>
                    <td>
                      <span className="text-xs text-[var(--color-text-muted)] truncate block max-w-[100px]">{wf.asset.name}</span>
                    </td>
                    <td>
                      <span className="text-xs text-[var(--color-text-muted)] truncate block max-w-[120px]">
                        {wf.steps[0]?.name ?? "—"}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${wf.status === "BLOCKED" ? "badge-red" : "badge-navy"}`}>
                        {wf.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 bg-[var(--color-slate-100)] rounded w-full" />
      <div className="h-16 bg-[var(--color-slate-100)] rounded w-full" />
      <div className="h-40 bg-[var(--color-slate-100)] rounded w-full" />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-48 bg-[var(--color-slate-100)] rounded" />
        <div className="h-48 bg-[var(--color-slate-100)] rounded" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
