import type { Metadata } from "next";
import Link from "next/link";
import {
  MOCK_ASSETS,
  MOCK_LOANS,
  PORTFOLIO_STATS,
  FX_EXPOSURES,
  MOCK_FX_RATES,
} from "@/lib/mock-data";
import {
  formatMillions,
  formatPercent,
  formatDate,
  covenantBadgeClass,
  covenantLabel,
  assetTypeLabel,
  countryFlag,
  countryName,
  scoreClass,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Portfolio Overview" };

export default function PortfolioPage() {
  const jurisdictions = [...new Set(MOCK_ASSETS.map((a) => a.country))];
  const assetTypes    = [...new Set(MOCK_ASSETS.map((a) => a.assetType))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">Portfolio Overview</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          ポートフォリオ概要 — Sanyo Capital Holdings Global Portfolio
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Portfolio AUM",
            labelJa: "運用資産総額",
            value: `¥${(PORTFOLIO_STATS.totalAumJpy / 1e9).toFixed(1)}B`,
            sub: `${formatMillions(PORTFOLIO_STATS.totalAumUsd, "USD")} USD equivalent`,
          },
          {
            label: "Total Debt",
            labelJa: "総負債残高",
            value: formatMillions(PORTFOLIO_STATS.totalDebtUsd, "USD"),
            sub: `Avg LTV ${formatPercent(PORTFOLIO_STATS.averageLtv)}`,
          },
          {
            label: "Weighted Occupancy",
            labelJa: "加重平均稼働率",
            value: formatPercent(PORTFOLIO_STATS.portfolioOccupancy),
            sub: `${PORTFOLIO_STATS.assetCount} assets`,
          },
          {
            label: "Portfolio Avg DSCR",
            labelJa: "平均DSCR",
            value: `${PORTFOLIO_STATS.averageDscr.toFixed(2)}x`,
            sub: `${PORTFOLIO_STATS.covenantBreaches} breach · ${PORTFOLIO_STATS.covenantWatch} watch`,
          },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className="text-2xl font-semibold font-numeric mt-1">{s.value}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Breakdown row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Geographic breakdown */}
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Geographic Exposure</h2>
            <span className="text-xs text-[var(--color-text-muted)]">地域別エクスポージャー</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {PORTFOLIO_STATS.jurisdictionBreakdown.map((j) => (
              <div key={j.country} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{countryFlag(j.country)}</span>
                    <span className="text-sm font-medium">{countryName(j.country)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-numeric">{j.pct}%</span>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatMillions(j.aum, j.currency)}
                    </p>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${j.pct}%`,
                      backgroundColor: "var(--color-navy-500)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asset type breakdown */}
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Sector Breakdown</h2>
            <span className="text-xs text-[var(--color-text-muted)]">セクター別</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {PORTFOLIO_STATS.assetTypeBreakdown.map((t) => (
              <div key={t.type} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{assetTypeLabel(t.type)}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-numeric">{t.pct}%</span>
                    <p className="text-xs text-[var(--color-text-muted)]">{t.count} asset{t.count > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${t.pct}%`,
                      backgroundColor: t.type === "OFFICE" ? "var(--color-navy-500)" :
                        t.type === "LOGISTICS" ? "var(--color-navy-400)" :
                        "var(--color-navy-300)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FX breakdown */}
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Currency Exposure</h2>
            <span className="text-xs text-[var(--color-text-muted)]">通貨別エクスポージャー</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {FX_EXPOSURES.map((fx) => {
              const rate = MOCK_FX_RATES[`${fx.currency}JPY` as keyof typeof MOCK_FX_RATES];
              const aum = MOCK_ASSETS.filter((a) => a.currency === fx.currency)
                .reduce((s, a) => s + (a.currentValuation ?? 0), 0);
              const pct = aum > 0 ? Math.round((aum / PORTFOLIO_STATS.totalAumUsd) * 100) : 0;

              return (
                <div key={fx.currency} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-semibold">{fx.currency}</span>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {rate?.toFixed(2)} JPY/{fx.currency} · {fx.hedgePct}% hedged
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold font-numeric">{pct}%</span>
                      <p className={`text-xs font-semibold ${fx.pnlJpy >= 0 ? "text-[var(--color-status-green)]" : "text-[var(--color-status-red)]"}`}>
                        {fx.pnlJpy >= 0 ? "+" : ""}¥{(fx.pnlJpy / 1e6).toFixed(0)}M P&L
                      </p>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: fx.currency === "USD" ? "var(--color-navy-500)" :
                          fx.currency === "GBP" ? "var(--color-status-amber)" :
                          "var(--color-navy-300)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed asset table */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">Asset Performance Table</h2>
          <span className="text-xs text-[var(--color-text-muted)]">物件別パフォーマンス</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                <th className="text-left px-4 py-3">Asset</th>
                <th className="text-right px-3 py-3">Acq. Cost</th>
                <th className="text-right px-3 py-3">Current Val.</th>
                <th className="text-right px-3 py-3">Gain / Loss</th>
                <th className="text-right px-3 py-3">Debt</th>
                <th className="text-right px-3 py-3">LTV</th>
                <th className="text-right px-3 py-3">DSCR</th>
                <th className="text-right px-3 py-3">Occupancy</th>
                <th className="text-center px-3 py-3">Covenant</th>
                <th className="text-center px-3 py-3">Op. Score</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ASSETS.map((asset, i) => {
                const loans = MOCK_LOANS.filter((l) => l.assetId === asset.id);
                const primaryLoan = loans[0];
                const totalDebt = loans.reduce((s, l) => s + l.currentBalance, 0);
                const gain = (asset.currentValuation ?? 0) - (asset.acquisitionCost ?? 0);
                const gainPct = asset.acquisitionCost
                  ? ((gain / asset.acquisitionCost) * 100)
                  : null;

                return (
                  <tr
                    key={asset.id}
                    className={`table-row-hover border-b border-[var(--color-border)] last:border-0 ${
                      i % 2 === 1 ? "bg-[var(--color-slate-50)/30]" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <Link href={`/assets/${asset.id}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{countryFlag(asset.country)}</span>
                          <div>
                            <p className="text-sm font-semibold hover:text-[var(--color-navy-700)]">
                              {asset.name}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">{asset.city}</p>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm">{formatMillions(asset.acquisitionCost ?? 0, asset.currency)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{formatDate(asset.acquisitionDate, "short")}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm font-semibold">{formatMillions(asset.currentValuation ?? 0, asset.currency)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{asset.currency}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className={`text-sm font-semibold ${gain >= 0 ? "text-[var(--color-status-green)]" : "text-[var(--color-status-red)]"}`}>
                        {gain >= 0 ? "+" : ""}{formatMillions(Math.abs(gain), asset.currency)}
                      </p>
                      {gainPct !== null && (
                        <p className={`text-xs ${gainPct >= 0 ? "text-[var(--color-status-green)]" : "text-[var(--color-status-red)]"}`}>
                          {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric text-sm">
                      {totalDebt > 0 ? formatMillions(totalDebt, asset.currency) : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      {primaryLoan?.ltv ? (
                        <span className={`text-sm font-medium ${
                          primaryLoan.ltv <= 55 ? "text-[var(--color-status-green)]" :
                          primaryLoan.ltv <= 65 ? "text-[var(--color-status-amber)]" :
                          "text-[var(--color-status-red)]"
                        }`}>
                          {formatPercent(primaryLoan.ltv)}
                        </span>
                      ) : <span className="text-sm text-[var(--color-text-muted)]">—</span>}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      {primaryLoan?.dscr ? (
                        <span className={`text-sm font-medium ${
                          primaryLoan.dscr >= 1.5 ? "text-[var(--color-status-green)]" :
                          primaryLoan.dscr >= 1.2 ? "text-[var(--color-status-amber)]" :
                          "text-[var(--color-status-red)]"
                        }`}>
                          {primaryLoan.dscr.toFixed(2)}x
                        </span>
                      ) : <span className="text-sm text-[var(--color-text-muted)]">—</span>}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <span className={`text-sm font-medium ${
                        (asset.occupancyRate ?? 0) >= 90 ? "text-[var(--color-status-green)]" :
                        (asset.occupancyRate ?? 0) >= 75 ? "text-[var(--color-status-amber)]" :
                        "text-[var(--color-status-red)]"
                      }`}>
                        {formatPercent(asset.occupancyRate ?? 0)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`badge ${covenantBadgeClass(asset.covenantStatus)}`}>
                        {covenantLabel(asset.covenantStatus)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <span className={`score-ring ${scoreClass(asset.operationalScore)}`}>
                          {asset.operationalScore ?? "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-slate-50)]">
                <td className="px-4 py-3 text-sm font-semibold">Portfolio Total</td>
                <td colSpan={3} className="px-3 py-3 text-right">
                  <span className="text-xs text-[var(--color-text-muted)]">Blended USD equivalent</span>
                </td>
                <td className="px-3 py-3 text-right font-numeric text-sm font-semibold">
                  {formatMillions(PORTFOLIO_STATS.totalDebtUsd, "USD")}
                </td>
                <td className="px-3 py-3 text-right font-numeric text-sm font-semibold">
                  {formatPercent(PORTFOLIO_STATS.averageLtv)}
                </td>
                <td className="px-3 py-3 text-right font-numeric text-sm font-semibold">
                  {PORTFOLIO_STATS.averageDscr.toFixed(2)}x
                </td>
                <td className="px-3 py-3 text-right font-numeric text-sm font-semibold">
                  {formatPercent(PORTFOLIO_STATS.portfolioOccupancy)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
