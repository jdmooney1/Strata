import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
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
export const dynamic = "force-dynamic";

const ORG_ID = "org_sanyo_001";

async function PortfolioContent() {
  const [assets, loans, fxRates] = await Promise.all([
    db.asset.findMany({
      where: { orgId: ORG_ID },
      include: { loans: { include: { covenants: true } }, leases: true },
    }),
    db.loan.findMany({ where: { asset: { orgId: ORG_ID } } }),
    db.fxRate.findMany({
      where: { orgId: ORG_ID },
      orderBy: { rateDate: "desc" },
    }),
  ]);

  // Computed KPIs
  const totalDebt = loans.reduce((s, l) => s + Number(l.currentBalance), 0);

  const loansWithLtv = loans.filter((l) => l.ltv != null);
  const avgLtv =
    loansWithLtv.length > 0
      ? loansWithLtv.reduce((s, l) => s + Number(l.ltv), 0) /
        loansWithLtv.length
      : 0;

  const assetsWithOccupancy = assets.filter((a) => a.occupancyRate != null);
  const avgOccupancy =
    assetsWithOccupancy.length > 0
      ? assetsWithOccupancy.reduce(
          (s, a) => s + Number(a.occupancyRate),
          0
        ) / assetsWithOccupancy.length
      : 0;

  // Total valuation per currency
  const valuationByCurrency: Record<string, number> = {};
  for (const a of assets) {
    if (a.currentValuation != null) {
      valuationByCurrency[a.currency] =
        (valuationByCurrency[a.currency] ?? 0) + Number(a.currentValuation);
    }
  }
  const totalValuationEntries = Object.entries(valuationByCurrency);

  // Geographic breakdown
  const countries = [...new Set(assets.map((a) => a.country))];
  const totalVal = Object.values(valuationByCurrency).reduce(
    (s, v) => s + v,
    0
  );
  const geoBreakdown = countries.map((country) => {
    const countryAssets = assets.filter((a) => a.country === country);
    const countryVal = countryAssets.reduce(
      (s, a) => s + Number(a.currentValuation ?? 0),
      0
    );
    const pct = totalVal > 0 ? Math.round((countryVal / totalVal) * 100) : 0;
    const currency = countryAssets[0]?.currency ?? "USD";
    return { country, val: countryVal, pct, currency, count: countryAssets.length };
  }).sort((a, b) => b.pct - a.pct);

  // Asset type breakdown
  const assetTypes = [...new Set(assets.map((a) => a.assetType))];
  const typeBreakdown = assetTypes.map((type) => {
    const typeAssets = assets.filter((a) => a.assetType === type);
    const typeVal = typeAssets.reduce(
      (s, a) => s + Number(a.currentValuation ?? 0),
      0
    );
    const pct = totalVal > 0 ? Math.round((typeVal / totalVal) * 100) : 0;
    return { type, val: typeVal, pct, count: typeAssets.length };
  }).sort((a, b) => b.pct - a.pct);

  // Currency breakdown
  const currencies = [...new Set(assets.map((a) => a.currency))];
  const currencyBreakdown = currencies.map((currency) => {
    const currAssets = assets.filter((a) => a.currency === currency);
    const currVal = currAssets.reduce(
      (s, a) => s + Number(a.currentValuation ?? 0),
      0
    );
    const pct = totalVal > 0 ? Math.round((currVal / totalVal) * 100) : 0;
    return { currency, val: currVal, pct };
  }).sort((a, b) => b.pct - a.pct);

  // Covenant summary
  const breachCount = assets.filter((a) => a.covenantStatus === "BREACH").length;
  const watchCount = assets.filter((a) => a.covenantStatus === "WATCH").length;

  // Build loans map by assetId
  const loansByAsset: Record<string, typeof loans> = {};
  for (const l of loans) {
    loansByAsset[l.assetId] = loansByAsset[l.assetId] ?? [];
    loansByAsset[l.assetId].push(l);
  }

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
            label: "Portfolio Assets",
            labelJa: "資産数",
            value: `${assets.length}`,
            sub:
              totalValuationEntries.length > 0
                ? totalValuationEntries
                    .map(([cur, val]) => `${formatMillions(val, cur)} ${cur}`)
                    .join(" · ")
                : "No valuations recorded",
          },
          {
            label: "Total Debt",
            labelJa: "総負債残高",
            value: formatMillions(totalDebt, "USD"),
            sub: `Avg LTV ${formatPercent(avgLtv)}`,
          },
          {
            label: "Weighted Occupancy",
            labelJa: "加重平均稼働率",
            value: formatPercent(avgOccupancy),
            sub: `${assets.length} assets`,
          },
          {
            label: "Covenant Status",
            labelJa: "コベナント状況",
            value: `${breachCount} breach · ${watchCount} watch`,
            sub: `${assets.length - breachCount - watchCount} compliant`,
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
            <span className="text-xs text-[var(--color-text-muted)]">
              地域別エクスポージャー
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {geoBreakdown.map((j) => (
              <div key={j.country} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{countryFlag(j.country)}</span>
                    <span className="text-sm font-medium">
                      {countryName(j.country)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-numeric">
                      {j.pct}%
                    </span>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatMillions(j.val, j.currency)}
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
            {geoBreakdown.length === 0 && (
              <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                No assets
              </p>
            )}
          </div>
        </div>

        {/* Asset type breakdown */}
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Sector Breakdown</h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              セクター別
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {typeBreakdown.map((t, idx) => (
              <div key={t.type} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">
                    {assetTypeLabel(t.type)}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-numeric">
                      {t.pct}%
                    </span>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t.count} asset{t.count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${t.pct}%`,
                      backgroundColor:
                        idx === 0
                          ? "var(--color-navy-500)"
                          : idx === 1
                          ? "var(--color-navy-400)"
                          : "var(--color-navy-300)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Currency breakdown */}
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Currency Exposure</h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              通貨別エクスポージャー
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {currencyBreakdown.map((c, idx) => (
              <div key={c.currency} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-semibold">{c.currency}</span>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatMillions(c.val, c.currency)} AUM
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-numeric">
                      {c.pct}%
                    </span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${c.pct}%`,
                      backgroundColor:
                        idx === 0
                          ? "var(--color-navy-500)"
                          : idx === 1
                          ? "var(--color-status-amber)"
                          : "var(--color-navy-300)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed asset table */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">Asset Performance Table</h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            物件別パフォーマンス
          </span>
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
              {assets.map((asset, i) => {
                const assetLoans = loansByAsset[asset.id] ?? [];
                const primaryLoan = assetLoans[0];
                const assetTotalDebt = assetLoans.reduce(
                  (s, l) => s + Number(l.currentBalance),
                  0
                );
                const curVal = Number(asset.currentValuation ?? 0);
                const acqCost = Number(asset.acquisitionCost ?? 0);
                const gain = curVal - acqCost;
                const gainPct =
                  acqCost > 0 ? (gain / acqCost) * 100 : null;

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
                          <span className="text-base">
                            {countryFlag(asset.country)}
                          </span>
                          <div>
                            <p className="text-sm font-semibold hover:text-[var(--color-navy-700)]">
                              {asset.name}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {asset.city}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm">
                        {formatMillions(acqCost, asset.currency)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatDate(asset.acquisitionDate, "short")}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm font-semibold">
                        {formatMillions(curVal, asset.currency)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {asset.currency}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p
                        className={`text-sm font-semibold ${
                          gain >= 0
                            ? "text-[var(--color-status-green)]"
                            : "text-[var(--color-status-red)]"
                        }`}
                      >
                        {gain >= 0 ? "+" : ""}
                        {formatMillions(Math.abs(gain), asset.currency)}
                      </p>
                      {gainPct !== null && (
                        <p
                          className={`text-xs ${
                            gainPct >= 0
                              ? "text-[var(--color-status-green)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {gainPct >= 0 ? "+" : ""}
                          {gainPct.toFixed(1)}%
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric text-sm">
                      {assetTotalDebt > 0
                        ? formatMillions(assetTotalDebt, asset.currency)
                        : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      {primaryLoan?.ltv != null ? (
                        <span
                          className={`text-sm font-medium ${
                            Number(primaryLoan.ltv) <= 55
                              ? "text-[var(--color-status-green)]"
                              : Number(primaryLoan.ltv) <= 65
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {formatPercent(Number(primaryLoan.ltv))}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      {primaryLoan?.dscr != null ? (
                        <span
                          className={`text-sm font-medium ${
                            Number(primaryLoan.dscr) >= 1.5
                              ? "text-[var(--color-status-green)]"
                              : Number(primaryLoan.dscr) >= 1.2
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {Number(primaryLoan.dscr).toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
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
                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`badge ${covenantBadgeClass(
                          asset.covenantStatus
                        )}`}
                      >
                        {covenantLabel(asset.covenantStatus)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
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
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-slate-50)]">
                <td className="px-4 py-3 text-sm font-semibold">
                  Portfolio Total
                </td>
                <td colSpan={3} className="px-3 py-3 text-right">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {assets.length} assets
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-numeric text-sm font-semibold">
                  {formatMillions(totalDebt, "USD")}
                </td>
                <td className="px-3 py-3 text-right font-numeric text-sm font-semibold">
                  {formatPercent(avgLtv)}
                </td>
                <td className="px-3 py-3 text-right font-numeric text-sm font-semibold">
                  —
                </td>
                <td className="px-3 py-3 text-right font-numeric text-sm font-semibold">
                  {formatPercent(avgOccupancy)}
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

function PortfolioLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 w-64 bg-[var(--color-slate-50)] rounded" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="data-card p-4 h-24 bg-[var(--color-slate-50)]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="data-card h-48 bg-[var(--color-slate-50)]"
          />
        ))}
      </div>
      <div className="data-card h-64 bg-[var(--color-slate-50)]" />
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PortfolioLoading />}>
      <PortfolioContent />
    </Suspense>
  );
}
