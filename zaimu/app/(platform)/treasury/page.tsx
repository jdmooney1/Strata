import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  formatMillions,
  formatPercent,
  formatDate,
  countryFlag,
  covenantBadgeClass,
  covenantLabel,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Treasury & FX" };
export const dynamic = "force-dynamic";

const ORG_ID = "org_sanyo_001";

async function TreasuryContent() {
  const [assets, loans, fxRates] = await Promise.all([
    db.asset.findMany({
      where: { orgId: ORG_ID },
      select: { id: true, name: true, country: true, currency: true },
    }),
    db.loan.findMany({
      where: { asset: { orgId: ORG_ID } },
      include: { covenants: true },
      orderBy: { maturityDate: "asc" },
    }),
    db.fxRate.findMany({
      where: { orgId: ORG_ID },
      orderBy: [{ baseCurrency: "asc" }, { rateDate: "desc" }],
    }),
  ]);

  // Build assets map
  const assetsMap = Object.fromEntries(assets.map((a) => [a.id, a]));

  // Total debt per currency
  const debtByCurrency: Record<string, number> = {};
  for (const l of loans) {
    debtByCurrency[l.currency] =
      (debtByCurrency[l.currency] ?? 0) + Number(l.currentBalance);
  }

  // Avg interest rate
  const avgInterestRate =
    loans.length > 0
      ? (loans.reduce((s, l) => s + Number(l.interestRate), 0) /
          loans.length) *
        100
      : 0;

  // Covenant summary across loans
  const allCovenants = loans.flatMap((l) => l.covenants);
  const breachCovenants = allCovenants.filter(
    (c) => c.status === "BREACH"
  ).length;
  const watchCovenants = allCovenants.filter(
    (c) => c.status === "WATCH"
  ).length;

  // FX rates — unique pairs (latest per pair)
  const fxPairsSeen = new Set<string>();
  const latestFxRates = fxRates.filter((r) => {
    const key = `${r.baseCurrency}/${r.quoteCurrency}`;
    if (fxPairsSeen.has(key)) return false;
    fxPairsSeen.add(key);
    return true;
  });

  // Debt maturity wall — group by year
  const maturityByYear: Record<number, number> = {};
  for (const l of loans) {
    const year = new Date(l.maturityDate).getFullYear();
    maturityByYear[year] = (maturityByYear[year] ?? 0) + Number(l.currentBalance);
  }
  const maturityYears = Object.entries(maturityByYear)
    .sort(([a], [b]) => Number(a) - Number(b));

  const maxMaturityAmount = Math.max(...Object.values(maturityByYear), 1);

  // FX sensitivity — impact of ±5% on USD/JPY for JPY-denominated debt
  const jpyUsdRate = latestFxRates.find(
    (r) => r.baseCurrency === "JPY" && r.quoteCurrency === "USD"
  ) ?? latestFxRates.find(
    (r) => r.baseCurrency === "USD" && r.quoteCurrency === "JPY"
  );
  const totalJpyDebt = loans
    .filter((l) => l.currency === "JPY")
    .reduce((s, l) => s + Number(l.currentBalance), 0);
  const totalUsdDebt = loans
    .filter((l) => l.currency === "USD")
    .reduce((s, l) => s + Number(l.currentBalance), 0);
  const totalAudDebt = loans
    .filter((l) => l.currency === "AUD")
    .reduce((s, l) => s + Number(l.currentBalance), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">Treasury & FX</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          財務・為替管理 — Debt tracking, FX exposure, cash flow obligations
        </p>
      </div>

      {/* Treasury Metrics */}
      <div className="data-card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-4 py-2.5 text-left section-label">Facilities</th>
              <th className="px-4 py-2.5 text-right section-label">Total Debt</th>
              <th className="px-4 py-2.5 text-right section-label">Avg Rate</th>
              <th className="px-4 py-2.5 text-right section-label">Covenants</th>
              <th className="px-4 py-2.5 text-right section-label">FX Pairs</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3">
                <p className="text-sm font-semibold font-numeric">{loans.length}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">across {assets.length} assets</p>
              </td>
              <td className="px-4 py-3 text-right">
                {Object.entries(debtByCurrency).map(([cur, val]) => (
                  <p key={cur} className="text-sm font-semibold font-numeric">
                    {formatMillions(val, cur)}{" "}
                    <span className="text-xs text-[var(--color-text-muted)]">{cur}</span>
                  </p>
                ))}
                {Object.keys(debtByCurrency).length === 0 && (
                  <p className="text-sm text-[var(--color-text-muted)]">No debt</p>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <p className="text-sm font-semibold font-numeric">{formatPercent(avgInterestRate, 2)}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Blended</p>
              </td>
              <td className="px-4 py-3 text-right">
                <p className="text-sm font-semibold font-numeric">{allCovenants.length}</p>
                {breachCovenants > 0 ? (
                  <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--color-status-red)" }}>
                    {breachCovenants} breach{breachCovenants > 1 ? "es" : ""}
                  </p>
                ) : watchCovenants > 0 ? (
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-status-amber)" }}>
                    {watchCovenants} on watch
                  </p>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">All compliant</p>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <p className="text-sm font-semibold font-numeric">{latestFxRates.length}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Active pairs</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Debt Maturity Wall */}
      {maturityYears.length > 0 && (
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <h2 className="text-sm font-semibold">Debt Maturity Wall</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                満期別負債残高
              </p>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-end gap-3">
              {maturityYears.map(([year, amount]) => {
                const heightPct = (amount / maxMaturityAmount) * 100;
                const barColor =
                  Number(year) <= new Date().getFullYear() + 1
                    ? "var(--color-status-red)"
                    : Number(year) <= new Date().getFullYear() + 2
                    ? "var(--color-status-amber)"
                    : "var(--color-navy-400)";
                return (
                  <div
                    key={year}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <p className="text-xs font-numeric text-[var(--color-text-muted)]">
                      {formatMillions(amount, "USD").replace("$", "")}
                    </p>
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${Math.max(heightPct, 4)}px`,
                        minHeight: "4px",
                        maxHeight: "80px",
                        backgroundColor: barColor,
                      }}
                    />
                    <p className="text-xs font-semibold">{year}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Loan Summary by Maturity */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">Debt Maturity Schedule</h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            ローン満期スケジュール
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                <th className="text-left px-4 py-3">Lender / Asset</th>
                <th className="text-left px-3 py-3">Currency</th>
                <th className="text-right px-3 py-3">Balance</th>
                <th className="text-right px-3 py-3">Rate</th>
                <th className="text-right px-3 py-3">Maturity</th>
                <th className="text-right px-3 py-3">LTV</th>
                <th className="text-right px-3 py-3">DSCR</th>
                <th className="text-center px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => {
                const asset = assetsMap[loan.assetId];
                const monthsToMaturity = Math.ceil(
                  (new Date(loan.maturityDate).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24 * 30)
                );
                return (
                  <tr
                    key={loan.id}
                    className="border-b border-[var(--color-border)] last:border-0 table-row-hover"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-2">
                        {asset && (
                          <span className="text-base mt-0.5">
                            {countryFlag(asset.country)}
                          </span>
                        )}
                        <div>
                          <p className="text-xs font-semibold">
                            {loan.lenderName}
                          </p>
                          {asset && (
                            <Link
                              href={`/assets/${asset.id}`}
                              className="text-xs text-[var(--color-text-muted)] hover:underline"
                            >
                              {asset.name}
                            </Link>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="badge badge-navy">
                              {loan.loanType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-sm font-semibold">
                      {loan.currency}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric text-sm font-semibold">
                      {formatMillions(Number(loan.currentBalance), loan.currency)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric text-xs text-[var(--color-text-secondary)]">
                      {formatPercent(Number(loan.interestRate) * 100, 2)}{" "}
                      {loan.rateType === "FIXED"
                        ? "fixed"
                        : loan.benchmark
                        ? `${loan.benchmark}+${formatPercent(Number(loan.margin ?? 0) * 100, 2)}`
                        : "float"}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p
                        className={`text-xs font-semibold ${
                          monthsToMaturity <= 12
                            ? "text-[var(--color-status-red)]"
                            : monthsToMaturity <= 18
                            ? "text-[var(--color-status-amber)]"
                            : "text-[var(--color-text-muted)]"
                        }`}
                      >
                        {formatDate(loan.maturityDate, "short")}
                      </p>
                      <p
                        className={`text-xs ${
                          monthsToMaturity <= 12
                            ? "text-[var(--color-status-red)]"
                            : monthsToMaturity <= 18
                            ? "text-[var(--color-status-amber)]"
                            : "text-[var(--color-text-muted)]"
                        }`}
                      >
                        {monthsToMaturity}mo
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      {loan.ltv != null ? (
                        <span
                          className={`text-sm font-medium ${
                            Number(loan.ltv) <= 55
                              ? "text-[var(--color-status-green)]"
                              : Number(loan.ltv) <= 65
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {formatPercent(Number(loan.ltv))}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      {loan.dscr != null ? (
                        <span
                          className={`text-sm font-medium ${
                            Number(loan.dscr) >= 1.5
                              ? "text-[var(--color-status-green)]"
                              : Number(loan.dscr) >= 1.2
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {Number(loan.dscr).toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`badge ${
                          loan.status === "CURRENT"
                            ? "badge-green"
                            : loan.status === "WATCH"
                            ? "badge-amber"
                            : "badge-red"
                        }`}
                      >
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {loans.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-4 text-center text-xs text-[var(--color-text-muted)]"
                  >
                    No loans recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two column: FX Rates + Covenant Summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* FX Rates Table */}
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <h2 className="text-sm font-semibold">FX Rates</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                為替レート
              </p>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              {latestFxRates.length} pair{latestFxRates.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                  <th className="text-left px-4 py-2.5">Base</th>
                  <th className="text-left px-3 py-2.5">Quote</th>
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
                    <td className="px-4 py-2.5 text-sm font-semibold">
                      {r.baseCurrency}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
                      {r.quoteCurrency}
                    </td>
                    <td className="px-3 py-2.5 text-right font-numeric text-sm font-medium">
                      {Number(r.rate).toFixed(4)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-[var(--color-text-muted)]">
                      {formatDate(r.rateDate, "short")}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-[var(--color-text-muted)]">
                      {r.source}
                    </td>
                  </tr>
                ))}
                {latestFxRates.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-center text-xs text-[var(--color-text-muted)]"
                    >
                      No FX rates recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Covenant Summary */}
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <h2 className="text-sm font-semibold">Covenant Summary</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                コベナント概要
              </p>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              {allCovenants.length} total
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {loans
              .filter((l) => l.covenants.length > 0)
              .map((loan) => {
                const asset = assetsMap[loan.assetId];
                return (
                  <div key={loan.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {asset && (
                          <span className="text-sm">
                            {countryFlag(asset.country)}
                          </span>
                        )}
                        <div>
                          <p className="text-xs font-semibold">
                            {loan.lenderName}
                          </p>
                          {asset && (
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {asset.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {loan.covenants.length} covenant
                        {loan.covenants.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {loan.covenants.map((cov) => (
                        <div
                          key={cov.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-[var(--color-text-secondary)] truncate">
                              {cov.covenantType}
                            </span>
                            {cov.currentValue && (
                              <span className="text-[var(--color-text-muted)] ml-2">
                                {cov.currentValue} / {cov.threshold}
                              </span>
                            )}
                          </div>
                          <span
                            className={`badge ml-2 flex-shrink-0 ${covenantBadgeClass(
                              cov.status
                            )}`}
                          >
                            {covenantLabel(cov.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            {loans.filter((l) => l.covenants.length > 0).length === 0 && (
              <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                No covenants recorded
              </p>
            )}
          </div>
        </div>
      </div>

      {/* FX Sensitivity */}
      {Object.keys(debtByCurrency).some((c) => c !== "JPY") && (
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <h2 className="text-sm font-semibold">FX Sensitivity</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                為替感応度 — Impact of ±5% JPY rate movement on total debt cost
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-text-secondary)]">Currency</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)]">Debt</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)]">Rate (¥/1)</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)]">JPY Equiv.</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)] bg-[#fff8f0]">+5% (JPY weakens)</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-text-secondary)] bg-[#f0fff4]">−5% (JPY strengthens)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(debtByCurrency)
                  .filter(([cur]) => cur !== "JPY")
                  .map(([cur, debtAmt]) => {
                    // Find JPY units per 1 unit of this currency
                    const direct = latestFxRates.find(
                      (r) => r.baseCurrency === cur && r.quoteCurrency === "JPY"
                    );
                    const inverse = latestFxRates.find(
                      (r) => r.baseCurrency === "JPY" && r.quoteCurrency === cur
                    );
                    const jpyPer1 = direct
                      ? Number(direct.rate)
                      : inverse
                      ? 1 / Number(inverse.rate)
                      : null;

                    const jpyValue = jpyPer1 != null ? debtAmt * jpyPer1 : null;
                    const impact = jpyValue != null ? jpyValue * 0.05 : null;
                    const rateDate = (direct ?? inverse)?.rateDate;

                    return (
                      <tr key={cur} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="text-sm font-semibold">{cur}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-numeric">
                          {cur} {formatMillions(debtAmt)}M
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-numeric">
                          {jpyPer1 != null ? (
                            <span>
                              {jpyPer1.toFixed(2)}
                              {rateDate && (
                                <span className="text-[var(--color-text-muted)] ml-1">
                                  as at {formatDate(rateDate, "short")}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-muted)]">No rate</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-numeric">
                          {jpyValue != null ? `¥${formatMillions(jpyValue)}M` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-numeric bg-[#fff8f0]">
                          {impact != null ? (
                            <span className="font-semibold" style={{ color: "var(--color-status-amber)" }}>
                              +¥{formatMillions(impact)}M
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-numeric bg-[#f0fff4]">
                          {impact != null ? (
                            <span className="font-semibold" style={{ color: "var(--color-status-green)" }}>
                              −¥{formatMillions(impact)}M
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TreasuryLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 w-48 bg-[var(--color-slate-50)] rounded" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="data-card p-4 h-24 bg-[var(--color-slate-50)]"
          />
        ))}
      </div>
      <div className="data-card h-48 bg-[var(--color-slate-50)]" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="data-card h-48 bg-[var(--color-slate-50)]"
          />
        ))}
      </div>
    </div>
  );
}

export default function TreasuryPage() {
  return (
    <Suspense fallback={<TreasuryLoading />}>
      <TreasuryContent />
    </Suspense>
  );
}
