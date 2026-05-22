import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  CheckSquare,
  ArrowRight,
  Building2,
  RefreshCw,
} from "lucide-react";
import {
  MOCK_ASSETS,
  MOCK_ALERTS,
  MOCK_TASKS,
  PORTFOLIO_STATS,
  MOCK_FX_RATES,
  FX_EXPOSURES,
} from "@/lib/mock-data";
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
  formatCurrency,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const criticalAlerts = MOCK_ALERTS.filter(
    (a) => !a.resolved && (a.severity === "CRITICAL" || a.severity === "HIGH")
  );

  const openTasks = MOCK_TASKS.filter(
    (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
  ).slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Critical Alert Banner */}
      {criticalAlerts.filter((a) => a.severity === "CRITICAL").length > 0 && (
        <div className="alert-critical rounded-md px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {criticalAlerts.filter((a) => a.severity === "CRITICAL").length}{" "}
              Critical Alert
              {criticalAlerts.filter((a) => a.severity === "CRITICAL").length >
              1
                ? "s"
                : ""}{" "}
              Require Immediate Attention
            </p>
            {criticalAlerts
              .filter((a) => a.severity === "CRITICAL")
              .map((a) => (
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
            label="Total AUM"
            labelJa="総運用資産"
            value={`¥${(PORTFOLIO_STATS.totalAumJpy / 1e9).toFixed(1)}B`}
            sub={formatMillions(PORTFOLIO_STATS.totalAumUsd, "USD")}
            trend={null}
          />
          <StatCard
            label="Total Debt"
            labelJa="総負債"
            value={formatMillions(PORTFOLIO_STATS.totalDebtUsd, "USD")}
            sub={`Avg LTV ${formatPercent(PORTFOLIO_STATS.averageLtv)}`}
            trend={null}
          />
          <StatCard
            label="Portfolio Occupancy"
            labelJa="ポートフォリオ稼働率"
            value={formatPercent(PORTFOLIO_STATS.portfolioOccupancy)}
            sub={`${PORTFOLIO_STATS.assetCount} assets`}
            trend={{ direction: "down", value: "-0.8%", label: "vs last month" }}
          />
          <StatCard
            label="Avg DSCR"
            labelJa="平均DSCR"
            value={`${PORTFOLIO_STATS.averageDscr.toFixed(2)}x`}
            sub={`${PORTFOLIO_STATS.covenantBreaches} breaches`}
            trend={
              PORTFOLIO_STATS.covenantBreaches > 0
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
                  {MOCK_ASSETS.map((asset, i) => (
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
                            asset.currentValuation ?? 0,
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
                            (asset.occupancyRate ?? 0) >= 90
                              ? "text-[var(--color-status-green)]"
                              : (asset.occupancyRate ?? 0) >= 75
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {formatPercent(asset.occupancyRate ?? 0)}
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
                {MOCK_ALERTS.filter((a) => !a.resolved).length} open
              </Link>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {MOCK_ALERTS.filter((a) => !a.resolved)
                .slice(0, 4)
                .map((alert) => (
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
                {openTasks.length} open
              </Link>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {openTasks.map((task) => (
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
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* FX Exposure */}
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <h2 className="text-sm font-semibold">FX Exposure</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                為替エクスポージャー
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-[var(--color-text-muted)]">
                Base: JPY
              </span>
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
                  <th className="text-left px-4 py-2.5">Currency</th>
                  <th className="text-right px-3 py-2.5">Gross</th>
                  <th className="text-right px-3 py-2.5">Hedged</th>
                  <th className="text-right px-3 py-2.5">Rate (JPY)</th>
                  <th className="text-right px-3 py-2.5">P&L (JPY)</th>
                </tr>
              </thead>
              <tbody>
                {FX_EXPOSURES.map((fx) => {
                  const rate =
                    MOCK_FX_RATES[
                      `${fx.currency}JPY` as keyof typeof MOCK_FX_RATES
                    ];
                  return (
                    <tr
                      key={fx.currency}
                      className="border-b border-[var(--color-border)] last:border-0 table-row-hover"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-sm">
                          {fx.currency}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-numeric text-sm">
                        {formatMillions(fx.grossExposure, fx.currency)}
                      </td>
                      <td className="px-3 py-3 text-right font-numeric">
                        <div>
                          <span className="text-sm">
                            {formatPercent(fx.hedgePct)}
                          </span>
                          <div
                            className="progress-bar mt-1"
                            style={{ width: 60 }}
                          >
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${fx.hedgePct}%`,
                                backgroundColor:
                                  fx.hedgePct >= 70
                                    ? "var(--color-status-green)"
                                    : fx.hedgePct >= 40
                                    ? "var(--color-status-amber)"
                                    : "var(--color-status-red)",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-numeric text-sm text-[var(--color-text-secondary)]">
                        {rate?.toFixed(2) ?? "—"}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-numeric text-sm font-medium ${
                          fx.pnlJpy >= 0
                            ? "text-[var(--color-status-green)]"
                            : "text-[var(--color-status-red)]"
                        }`}
                      >
                        {fx.pnlJpy >= 0 ? "+" : ""}¥
                        {(fx.pnlJpy / 1e6).toFixed(0)}M
                      </td>
                    </tr>
                  );
                })}
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
              {MOCK_ASSETS.filter((a) => a.refinancingDate)
                .sort(
                  (a, b) =>
                    new Date(a.refinancingDate!).getTime() -
                    new Date(b.refinancingDate!).getTime()
                )
                .map((asset) => {
                  const date = new Date(asset.refinancingDate!);
                  const now = new Date();
                  const monthsUntil = Math.ceil(
                    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
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
                        <p className={`text-sm font-semibold font-numeric ${urgency}`}>
                          {formatDate(asset.refinancingDate, "short")}
                        </p>
                        <p className={`text-xs ${urgency}`}>
                          {monthsUntil} months
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* AI Portfolio Summary */}
      <div className="ai-insight">
        <p className="ai-insight-label">AI Portfolio Analysis — 2026年5月</p>
        <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
          Portfolio performance remains broadly stable with two material risk items requiring attention.{" "}
          <strong>Canary Wharf</strong> presents the most urgent operational risk: the DSCR covenant breach
          (1.12x vs. 1.30x threshold) combined with the Morgan Stanley lease expiry creates compounding
          LTV pressure as the June 2026 loan maturity approaches. Recommended immediate action: lender
          notification within 5 business days and appointment of a refinancing adviser by end of May.
          Separately, the <strong>Goldman Sachs renewal</strong> at 1 Market Plaza should be prioritised
          before the August break clause window closes — tenant engagement is progressing constructively.
          FX headwinds from GBP depreciation represent a JPY 890M unrealised loss, though 80% hedge
          coverage limits further downside exposure.
        </p>
      </div>
    </div>
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
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "⚠"}{" "}
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
