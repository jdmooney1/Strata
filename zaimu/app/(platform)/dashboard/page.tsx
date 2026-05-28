import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckSquare,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  GitBranch,
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
  priorityBadgeClass,
  taskStatusBadgeClass,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const ORG_ID = "org_sanyo_001";

async function DashboardContent() {
  const [assets, allLoans, alerts, tasks, fxRates, riskEvents, activeWorkflows] = await Promise.all([
    db.asset.findMany({
      where: { orgId: ORG_ID },
      include: { loans: { include: { covenants: true } } },
    }),
    db.loan.findMany({ where: { asset: { orgId: ORG_ID } } }),
    db.alert.findMany({
      where: { asset: { orgId: ORG_ID }, resolved: false },
      orderBy: { triggeredAt: "desc" },
      take: 10,
    }),
    db.task.findMany({
      where: { orgId: ORG_ID, status: { notIn: ["COMPLETE", "CANCELLED"] } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    db.fxRate.findMany({
      where: { orgId: ORG_ID },
      orderBy: { rateDate: "desc" },
      take: 20,
    }),
    db.riskEvent.findMany({
      where: {
        orgId: ORG_ID,
        severity: { in: ["CRITICAL", "ESCALATED"] },
        status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] },
      },
      include: { asset: { select: { id: true, name: true } } },
      orderBy: { firstDetectedAt: "desc" },
      take: 3,
    }),
    db.workflow.findMany({
      where: {
        orgId: ORG_ID,
        status: { in: ["ACTIVE", "BLOCKED"] },
      },
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
      take: 4,
    }),
  ]);

  // Computed KPIs
  const totalDebt = allLoans.reduce((s, l) => s + Number(l.currentBalance), 0);
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
  );
  const covenantBreaches = assets.filter(
    (a) => a.covenantStatus === "BREACH"
  ).length;

  const assetsWithOccupancy = assets.filter((a) => a.occupancyRate != null);
  const avgOccupancy =
    assetsWithOccupancy.length > 0
      ? assetsWithOccupancy.reduce(
          (s, a) => s + Number(a.occupancyRate),
          0
        ) / assetsWithOccupancy.length
      : 0;

  // Unique FX pairs (latest rate per pair)
  const fxPairsSeen = new Set<string>();
  const latestFxRates = fxRates.filter((r) => {
    const key = `${r.baseCurrency}/${r.quoteCurrency}`;
    if (fxPairsSeen.has(key)) return false;
    fxPairsSeen.add(key);
    return true;
  });

  const criticalOnly = alerts.filter((a) => a.severity === "CRITICAL");

  return (
    <div className="space-y-5">
      {/* Critical Alert Banner */}
      {criticalOnly.length > 0 && (
        <div className="alert-critical rounded-md px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {criticalOnly.length} Critical Alert
              {criticalOnly.length > 1 ? "s" : ""} Require Immediate Attention
            </p>
            {criticalOnly.map((a) => (
              <p key={a.id} className="text-xs mt-0.5 opacity-80">
                {a.title}
              </p>
            ))}
          </div>
          <Link
            href="/alerts"
            className="text-xs font-semibold underline whitespace-nowrap"
          >
            View All
          </Link>
        </div>
      )}

      {/* Portfolio KPIs */}
      <div>
        <p className="section-label mb-3">Portfolio Overview</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total Assets"
            labelJa="総資産数"
            value={`${assets.length}`}
            sub="Active portfolio assets"
            trend={null}
          />
          <StatCard
            label="Total Debt"
            labelJa="総負債"
            value={formatMillions(totalDebt, "USD")}
            sub="All loan currencies combined"
            trend={null}
          />
          <StatCard
            label="Portfolio Occupancy"
            labelJa="ポートフォリオ稼働率"
            value={formatPercent(avgOccupancy)}
            sub={`${assetsWithOccupancy.length} assets with occupancy data`}
            trend={null}
          />
          <StatCard
            label="Covenant Alerts"
            labelJa="コベナント警告"
            value={`${covenantBreaches}`}
            sub={`${criticalAlerts.length} critical / high alerts open`}
            trend={
              covenantBreaches > 0
                ? { direction: "alert", value: "Action required" }
                : null
            }
          />
        </div>
      </div>

      {/* Two-column main section */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Asset Summary Table */}
        <div className="lg:col-span-2">
          <div className="data-card">
            <div className="data-card-header">
              <div>
                <h2 className="text-sm font-semibold">Asset Summary</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  アセット概要
                </p>
              </div>
              <Link
                href="/assets"
                className="text-xs text-[var(--color-text-link)] font-medium flex items-center gap-1 hover:underline"
              >
                All Assets <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left px-4 py-2.5">Asset</th>
                    <th className="text-left px-3 py-2.5">Type</th>
                    <th className="text-right px-3 py-2.5">Valuation</th>
                    <th className="text-right px-3 py-2.5">Occ.</th>
                    <th className="text-center px-3 py-2.5">Covenant</th>
                    <th className="text-center px-3 py-2.5">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset, i) => (
                    <tr
                      key={asset.id}
                      className={`table-row-hover border-b border-[var(--color-border)] last:border-0 ${
                        i % 2 === 1 ? "bg-[var(--color-slate-50)]" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/assets/${asset.id}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">
                              {countryFlag(asset.country)}
                            </span>
                            <div>
                              <p className="font-medium text-sm text-[var(--color-text-primary)] hover:text-[var(--color-navy-600)] leading-tight">
                                {asset.name}
                              </p>
                              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                {asset.city}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {assetTypeLabel(asset.assetType)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-numeric">
                        <p className="text-sm font-medium">
                          {formatMillions(
                            Number(asset.currentValuation ?? 0),
                            asset.currency
                          )}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {asset.currency}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-numeric">
                        <span
                          className={`text-sm font-medium ${
                            Number(asset.occupancyRate ?? 0) >= 90
                              ? "text-[var(--color-status-green)]"
                              : Number(asset.occupancyRate ?? 0) >= 75
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {asset.occupancyRate != null
                            ? formatPercent(Number(asset.occupancyRate))
                            : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`badge ${covenantBadgeClass(
                            asset.covenantStatus
                          )}`}
                        >
                          {covenantLabel(asset.covenantStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <span
                            className={`score-ring ${scoreClass(
                              asset.operationalScore
                            )}`}
                          >
                            {asset.operationalScore ?? "—"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Risk Alerts */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-[var(--color-navy-600)]" />
                <h2 className="text-sm font-semibold">Risk Alerts</h2>
              </div>
              <Link
                href="/risk"
                className="text-xs text-[var(--color-text-link)] hover:underline"
              >
                View all →
              </Link>
            </div>
            {riskEvents.length === 0 ? (
              <div className="px-4 py-4 flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--color-status-green)]" />
                <p className="text-xs text-[var(--color-text-muted)]">All clear — no critical risk events</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {riskEvents.map((risk) => (
                  <div key={risk.id} className="px-4 py-2.5 flex items-start gap-2.5">
                    <span
                      className={`badge flex-shrink-0 mt-0.5 ${
                        risk.severity === "ESCALATED" ? "badge-red" : "badge-red"
                      }`}
                    >
                      {risk.severity === "ESCALATED" ? "ESC" : "CRIT"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight text-[var(--color-text-primary)] truncate">
                        {risk.title}
                      </p>
                      {risk.asset && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                          {risk.asset.name}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/risk/${risk.id}`}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-navy-600)] flex-shrink-0"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Alerts */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-[var(--color-status-amber)]" />
                <h2 className="text-sm font-semibold">Active Alerts</h2>
              </div>
              <Link
                href="/alerts"
                className="text-xs text-[var(--color-text-link)] hover:underline"
              >
                {alerts.length} open
              </Link>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className="px-4 py-3 flex items-start gap-2.5"
                >
                  <span
                    className={`status-dot mt-1.5 flex-shrink-0 ${
                      alert.severity === "CRITICAL"
                        ? "status-dot-red"
                        : alert.severity === "HIGH"
                        ? "status-dot-amber"
                        : "status-dot-blue"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight text-[var(--color-text-primary)] truncate">
                      {alert.title}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  No active alerts
                </p>
              )}
            </div>
          </div>

          {/* Open Tasks */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <CheckSquare className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Priority Tasks</h2>
              </div>
              <Link
                href="/tasks"
                className="text-xs text-[var(--color-text-link)] hover:underline"
              >
                {tasks.length} open
              </Link>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="px-4 py-2.5 flex items-start gap-2.5"
                >
                  <span
                    className={`badge ${priorityBadgeClass(
                      task.priority
                    )} mt-0.5 flex-shrink-0`}
                  >
                    {task.priority.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight text-[var(--color-text-primary)] line-clamp-2">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Due {formatDate(task.dueDate, "short")}
                      </span>
                      <span
                        className={`badge ${taskStatusBadgeClass(task.status)}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  No open tasks
                </p>
              )}
            </div>
          </div>

          {/* Active Workflows */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Active Workflows</h2>
              </div>
              <Link
                href="/workflows"
                className="text-xs text-[var(--color-text-link)] hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {activeWorkflows.map((wf) => {
                const currentStep = wf.steps[0] ?? null;
                return (
                  <Link
                    key={wf.id}
                    href={`/workflows/${wf.id}`}
                    className="block px-4 py-2.5 hover:bg-[var(--color-slate-50)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                          {wf.title}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                          {wf.asset.name}
                        </p>
                        {currentStep && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                            ↳ {currentStep.name}
                          </p>
                        )}
                      </div>
                      <span
                        className={`badge flex-shrink-0 mt-0.5 ${
                          wf.status === "BLOCKED" ? "badge-red" : "badge-navy"
                        }`}
                      >
                        {wf.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {activeWorkflows.length === 0 && (
                <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  No active workflows
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* FX Rates */}
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <h2 className="text-sm font-semibold">FX Rates</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                為替レート
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Link
                href="/treasury"
                className="text-xs text-[var(--color-text-link)] hover:underline"
              >
                Treasury →
              </Link>
            </div>
          </div>
          <div className="data-card-body p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left px-4 py-2.5">Pair</th>
                  <th className="text-right px-3 py-2.5">Rate</th>
                  <th className="text-right px-3 py-2.5">Date</th>
                  <th className="text-right px-3 py-2.5">Source</th>
                </tr>
              </thead>
              <tbody>
                {latestFxRates.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--color-border)] last:border-0 table-row-hover"
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-sm">
                        {r.baseCurrency}/{r.quoteCurrency}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-numeric text-sm">
                      {Number(r.rate).toFixed(4)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-[var(--color-text-muted)]">
                      {formatDate(r.rateDate, "short")}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-[var(--color-text-muted)]">
                      {r.source}
                    </td>
                  </tr>
                ))}
                {latestFxRates.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-xs text-[var(--color-text-muted)]"
                    >
                      No FX rates recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refinancing Timeline */}
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <h2 className="text-sm font-semibold">Refinancing Timeline</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                リファイナンスタイムライン
              </p>
            </div>
            <RefreshCw className="size-4 text-[var(--color-text-muted)]" />
          </div>
          <div className="data-card-body">
            <div className="space-y-1">
              {assets
                .filter((a) => a.refinancingDate)
                .sort(
                  (a, b) =>
                    new Date(a.refinancingDate!).getTime() -
                    new Date(b.refinancingDate!).getTime()
                )
                .map((asset) => {
                  const date = new Date(asset.refinancingDate!);
                  const now = new Date();
                  const monthsUntil = Math.ceil(
                    (date.getTime() - now.getTime()) /
                      (1000 * 60 * 60 * 24 * 30)
                  );
                  const urgency =
                    monthsUntil <= 12
                      ? "text-[var(--color-status-red)]"
                      : monthsUntil <= 18
                      ? "text-[var(--color-status-amber)]"
                      : "text-[var(--color-status-green)]";

                  return (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm">
                          {countryFlag(asset.country)}
                        </span>
                        <div>
                          <Link
                            href={`/assets/${asset.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {asset.name}
                          </Link>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {asset.currency} loan
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold font-numeric ${urgency}`}
                        >
                          {formatDate(asset.refinancingDate, "short")}
                        </p>
                        <p className={`text-xs ${urgency}`}>
                          {monthsUntil} months
                        </p>
                      </div>
                    </div>
                  );
                })}
              {assets.filter((a) => a.refinancingDate).length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] py-2">
                  No refinancing dates set
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Portfolio Summary */}
      <div className="ai-insight">
        <p className="ai-insight-label">AI Portfolio Analysis — 2026年5月</p>
        <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
          Portfolio performance remains broadly stable with two material risk
          items requiring attention. <strong>Canary Wharf</strong> presents the
          most urgent operational risk: the DSCR covenant breach (1.12x vs.
          1.30x threshold) combined with the Morgan Stanley lease expiry creates
          compounding LTV pressure as the June 2026 loan maturity approaches.
          Recommended immediate action: lender notification within 5 business
          days and appointment of a refinancing adviser by end of May.
          Separately, the <strong>Goldman Sachs renewal</strong> at 1 Market
          Plaza should be prioritised before the August break clause window
          closes — tenant engagement is progressing constructively. FX
          headwinds from GBP depreciation represent a JPY 890M unrealised loss,
          though 80% hedge coverage limits further downside exposure.
        </p>
      </div>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="data-card p-4 h-24 bg-[var(--color-slate-50)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 data-card h-64 bg-[var(--color-slate-50)]" />
        <div className="space-y-4">
          <div className="data-card h-32 bg-[var(--color-slate-50)]" />
          <div className="data-card h-32 bg-[var(--color-slate-50)]" />
        </div>
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

// ─── Inline StatCard ───────────────────────────────────────────────────────

function StatCard({
  label,
  labelJa,
  value,
  sub,
  trend,
}: {
  label: string;
  labelJa: string;
  value: string;
  sub: string;
  trend: {
    direction: "up" | "down" | "alert";
    value: string;
    label?: string;
  } | null;
}) {
  return (
    <div className="data-card p-4">
      <p className="section-label">{label}</p>
      <p className="text-xs text-[var(--color-text-muted)] mb-2">{labelJa}</p>
      <p className="text-2xl font-semibold font-numeric tracking-tight text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{sub}</p>
      {trend && (
        <div
          className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
            trend.direction === "up"
              ? "text-[var(--color-status-green)]"
              : trend.direction === "down"
              ? "text-[var(--color-status-red)]"
              : "text-[var(--color-status-amber)]"
          }`}
        >
          {trend.direction === "up"
            ? "↑"
            : trend.direction === "down"
            ? "↓"
            : "⚠"}{" "}
          {trend.value}
          {trend.label && (
            <span className="text-[var(--color-text-muted)] font-normal">
              {" "}
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
