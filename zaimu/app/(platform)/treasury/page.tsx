import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import {
  MOCK_LOANS,
  MOCK_ASSETS,
  MOCK_FX_RATES,
  FX_EXPOSURES,
  PORTFOLIO_STATS,
} from "@/lib/mock-data";
import {
  formatMillions,
  formatPercent,
  formatDate,
  countryFlag,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Treasury & FX" };

export default function TreasuryPage() {
  const assetsMap = Object.fromEntries(MOCK_ASSETS.map((a) => [a.id, a]));

  const totalDebtUsd = MOCK_LOANS.reduce((sum, l) => {
    const rates: Record<string, number> = { USD: 1, AUD: 0.64, GBP: 1.26, EUR: 1.08 };
    return sum + l.currentBalance * (rates[l.currency] ?? 1);
  }, 0);

  // Upcoming amortisation payments (simulated)
  const upcomingPayments = [
    { date: "2026-06-30", lender: "Wells Fargo Bank",       assetId: "ast_001", currency: "USD", amount: 420000,  type: "Interest" },
    { date: "2026-06-30", lender: "ANZ Banking Group",      assetId: "ast_002", currency: "AUD", amount: 398000,  type: "Interest" },
    { date: "2026-06-30", lender: "JPMorgan Chase",         assetId: "ast_003", currency: "USD", amount: 620000,  type: "Interest + Principal" },
    { date: "2026-06-30", lender: "HSBC UK",               assetId: "ast_004", currency: "GBP", amount: 738000,  type: "Interest" },
    { date: "2026-06-30", lender: "CBA",                   assetId: "ast_005", currency: "AUD", amount: 275000,  type: "Interest" },
    { date: "2026-09-30", lender: "Wells Fargo Bank",       assetId: "ast_001", currency: "USD", amount: 420000,  type: "Interest" },
    { date: "2026-09-30", lender: "ANZ Banking Group",      assetId: "ast_002", currency: "AUD", amount: 398000,  type: "Interest" },
    { date: "2026-09-30", lender: "HSBC UK",               assetId: "ast_004", currency: "GBP", amount: 738000,  type: "Interest" },
  ];

  const loansByMaturity = [...MOCK_LOANS].sort(
    (a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime()
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">Treasury & FX</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          財務・為替管理 — Debt tracking, FX exposure, cash flow obligations
        </p>
      </div>

      {/* Treasury KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total Debt (USD eq.)",
            labelJa: "総負債（USD換算）",
            value: formatMillions(totalDebtUsd, "USD"),
            sub: `Avg LTV ${formatPercent(PORTFOLIO_STATS.averageLtv)}`,
          },
          {
            label: "Avg Interest Rate",
            labelJa: "平均金利",
            value: formatPercent(
              (MOCK_LOANS.reduce((s, l) => s + l.interestRate, 0) / MOCK_LOANS.length) * 100,
              2
            ),
            sub: "Blended across portfolio",
          },
          {
            label: "Avg DSCR",
            labelJa: "平均DSCR",
            value: `${PORTFOLIO_STATS.averageDscr.toFixed(2)}x`,
            sub: `${PORTFOLIO_STATS.covenantBreaches} breach · ${PORTFOLIO_STATS.covenantWatch} watch`,
            alert: PORTFOLIO_STATS.covenantBreaches > 0,
          },
          {
            label: "FX P&L (Unrealised)",
            labelJa: "為替損益（未実現）",
            value: `¥${((FX_EXPOSURES.reduce((s, f) => s + f.pnlJpy, 0)) / 1e6).toFixed(0)}M`,
            sub: "Net across USD / GBP / AUD",
            negative: FX_EXPOSURES.reduce((s, f) => s + f.pnlJpy, 0) < 0,
          },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className={`text-xl font-semibold font-numeric mt-1 ${
              s.alert ? "text-[var(--color-status-red)]" :
              s.negative ? "text-[var(--color-status-red)]" : ""
            }`}>
              {s.value}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* FX Exposure Table */}
      <div className="data-card">
        <div className="data-card-header">
          <div>
            <h2 className="text-sm font-semibold">FX Exposure Analysis</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">為替エクスポージャー分析</p>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">Base currency: JPY</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                <th className="text-left px-4 py-3">Currency</th>
                <th className="text-right px-3 py-3">Spot Rate</th>
                <th className="text-right px-3 py-3">Gross Exposure</th>
                <th className="text-right px-3 py-3">Hedged</th>
                <th className="text-right px-3 py-3">Hedge %</th>
                <th className="text-right px-3 py-3">Unhedged JPY</th>
                <th className="text-right px-3 py-3">Unrealised P&L</th>
              </tr>
            </thead>
            <tbody>
              {FX_EXPOSURES.map((fx) => {
                const rate = MOCK_FX_RATES[`${fx.currency}JPY` as keyof typeof MOCK_FX_RATES];
                const unhedgedAmt = fx.grossExposure - fx.hedged;
                const unhedgedJpy = unhedgedAmt * (rate ?? 0);

                return (
                  <tr key={fx.currency} className="border-b border-[var(--color-border)] last:border-0 table-row-hover">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-semibold">{fx.currency}</span>
                        <span className={`badge ${
                          fx.hedgePct >= 70 ? "badge-green" :
                          fx.hedgePct >= 40 ? "badge-amber" :
                          "badge-red"
                        }`}>
                          {fx.hedgePct >= 70 ? "Adequately Hedged" : fx.hedgePct >= 40 ? "Partially Hedged" : "Under-Hedged"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm font-medium">{rate?.toFixed(2)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">JPY/{fx.currency}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm">{formatMillions(fx.grossExposure, fx.currency)}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm">{formatMillions(fx.hedged, fx.currency)}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <div>
                        <p className="text-sm font-numeric">{formatPercent(fx.hedgePct)}</p>
                        <div className="progress-bar mt-1" style={{ width: 60, marginLeft: "auto" }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${fx.hedgePct}%`,
                              backgroundColor:
                                fx.hedgePct >= 70 ? "var(--color-status-green)" :
                                fx.hedgePct >= 40 ? "var(--color-status-amber)" :
                                "var(--color-status-red)",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm">¥{(unhedgedJpy / 1e9).toFixed(1)}B</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{formatMillions(unhedgedAmt, fx.currency)} unhedged</p>
                    </td>
                    <td className={`px-3 py-3.5 text-right font-numeric font-semibold ${
                      fx.pnlJpy >= 0 ? "text-[var(--color-status-green)]" : "text-[var(--color-status-red)]"
                    }`}>
                      {fx.pnlJpy >= 0 ? "+" : ""}¥{(fx.pnlJpy / 1e6).toFixed(0)}M
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two column: Loans + Upcoming Payments */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Loan Summary */}
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Loan Summary by Maturity</h2>
            <span className="text-xs text-[var(--color-text-muted)]">ローン一覧（満期順）</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {loansByMaturity.map((loan) => {
              const asset = assetsMap[loan.assetId];
              const monthsToMaturity = Math.ceil(
                (new Date(loan.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
              );
              return (
                <div key={loan.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {asset && <span className="text-base">{countryFlag(asset.country)}</span>}
                      <div>
                        <p className="text-xs font-semibold">{loan.lenderName}</p>
                        {asset && (
                          <Link href={`/assets/${asset.id}`} className="text-xs text-[var(--color-text-muted)] hover:underline">
                            {asset.name}
                          </Link>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="badge badge-navy">{loan.loanType}</span>
                          <span className={`badge ${
                            loan.status === "CURRENT" ? "badge-green" :
                            loan.status === "WATCH" ? "badge-amber" :
                            "badge-red"
                          }`}>{loan.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold font-numeric">
                        {formatMillions(loan.currentBalance, loan.currency)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatPercent(loan.interestRate * 100, 2)} {loan.rateType === "FIXED" ? "fixed" : `${loan.benchmark ?? ""} +${formatPercent((loan.margin ?? 0) * 100, 2)}`}
                      </p>
                      <p className={`text-xs font-semibold mt-0.5 ${
                        monthsToMaturity <= 12 ? "text-[var(--color-status-red)]" :
                        monthsToMaturity <= 18 ? "text-[var(--color-status-amber)]" :
                        "text-[var(--color-text-muted)]"
                      }`}>
                        {formatDate(loan.maturityDate, "short")} · {monthsToMaturity}mo
                      </p>
                    </div>
                  </div>

                  {/* LTV / DSCR bars */}
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-[var(--color-text-muted)]">LTV</span>
                        <span className="font-numeric font-medium">{formatPercent(loan.ltv ?? 0)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{
                          width: `${Math.min(loan.ltv ?? 0, 100)}%`,
                          backgroundColor: (loan.ltv ?? 0) <= 55 ? "var(--color-status-green)" :
                            (loan.ltv ?? 0) <= 65 ? "var(--color-status-amber)" : "var(--color-status-red)",
                        }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-[var(--color-text-muted)]">DSCR</span>
                        <span className="font-numeric font-medium">{loan.dscr?.toFixed(2) ?? "—"}x</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{
                          width: `${Math.min(((loan.dscr ?? 0) / 2) * 100, 100)}%`,
                          backgroundColor: (loan.dscr ?? 0) >= 1.5 ? "var(--color-status-green)" :
                            (loan.dscr ?? 0) >= 1.2 ? "var(--color-status-amber)" : "var(--color-status-red)",
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="text-sm font-semibold">Upcoming Debt Service</h2>
            <span className="text-xs text-[var(--color-text-muted)]">今後の返済スケジュール</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                  <th className="text-left px-4 py-2.5">Due Date</th>
                  <th className="text-left px-3 py-2.5">Lender</th>
                  <th className="text-left px-3 py-2.5">Type</th>
                  <th className="text-right px-3 py-2.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {upcomingPayments.map((p, i) => {
                  const asset = assetsMap[p.assetId];
                  return (
                    <tr key={i} className="border-b border-[var(--color-border)] last:border-0 table-row-hover">
                      <td className="px-4 py-2.5 text-sm font-numeric">
                        {formatDate(p.date, "medium")}
                      </td>
                      <td className="px-3 py-2.5">
                        <div>
                          <p className="text-xs font-medium">{p.lender.split(" ")[0]}</p>
                          {asset && (
                            <p className="text-xs text-[var(--color-text-muted)]">{countryFlag(asset.country)} {asset.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="badge badge-gray">{p.type}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-numeric">
                        <span className="text-sm font-medium">
                          {p.currency} {p.amount.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
