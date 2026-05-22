import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Filter, Download } from "lucide-react";
import { MOCK_ASSETS, MOCK_LOANS } from "@/lib/mock-data";
import {
  formatMillions,
  formatPercent,
  formatDate,
  covenantBadgeClass,
  covenantLabel,
  assetTypeLabel,
  assetStatusBadgeClass,
  assetStatusLabel,
  scoreClass,
  countryFlag,
  countryName,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Assets" };

export default function AssetsPage() {
  // Compute debt for each asset
  const assetDebt = MOCK_ASSETS.map((asset) => {
    const loans = MOCK_LOANS.filter((l) => l.assetId === asset.id);
    const totalDebt = loans.reduce((sum, l) => sum + l.currentBalance, 0);
    const primaryLoan = loans[0];
    return { ...asset, totalDebt, primaryLoan };
  });

  const totalAum = MOCK_ASSETS.reduce(
    (sum, a) => sum + (a.currentValuation ?? 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Asset Register</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            アセット台帳 — {MOCK_ASSETS.length} assets across{" "}
            {new Set(MOCK_ASSETS.map((a) => a.country)).size} jurisdictions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--color-border)] rounded-md text-[var(--color-text-secondary)] bg-white hover:bg-[var(--color-slate-50)] transition-colors">
            <Filter className="size-3.5" />
            Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--color-border)] rounded-md text-[var(--color-text-secondary)] bg-white hover:bg-[var(--color-slate-50)] transition-colors">
            <Download className="size-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {[
          {
            label: "Total Assets",
            labelJa: "総資産数",
            value: MOCK_ASSETS.length.toString(),
          },
          {
            label: "Portfolio AUM",
            labelJa: "総資産規模",
            value: `$${(totalAum / 1e9).toFixed(2)}B`,
            note: "blended USD eq.",
          },
          {
            label: "Countries",
            labelJa: "国数",
            value: `${new Set(MOCK_ASSETS.map((a) => a.country)).size}`,
          },
          {
            label: "Avg Occupancy",
            labelJa: "平均稼働率",
            value: formatPercent(
              MOCK_ASSETS.reduce((s, a) => s + (a.occupancyRate ?? 0), 0) /
                MOCK_ASSETS.length
            ),
          },
          {
            label: "Covenant Issues",
            labelJa: "コベナンツ問題",
            value: `${
              MOCK_ASSETS.filter(
                (a) =>
                  a.covenantStatus === "BREACH" ||
                  a.covenantStatus === "WATCH"
              ).length
            }`,
            alert: true,
          },
          {
            label: "Refi Due < 18mo",
            labelJa: "18ヶ月以内満期",
            value: `${
              MOCK_ASSETS.filter((a) => {
                if (!a.refinancingDate) return false;
                const m =
                  (new Date(a.refinancingDate).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24 * 30);
                return m <= 18;
              }).length
            }`,
            alert: true,
          },
        ].map((s) => (
          <div key={s.label} className="data-card p-3">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p
              className={`text-xl font-semibold font-numeric mt-1 ${
                s.alert ? "text-[var(--color-status-amber)]" : ""
              }`}
            >
              {s.value}
            </p>
            {s.note && (
              <p className="text-xs text-[var(--color-text-muted)]">{s.note}</p>
            )}
          </div>
        ))}
      </div>

      {/* Asset Table */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">All Assets</h2>
          <span className="badge badge-gray">{MOCK_ASSETS.length} assets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                <th className="text-left px-4 py-3">Asset / Location</th>
                <th className="text-left px-3 py-3">Type</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-right px-3 py-3">Valuation</th>
                <th className="text-right px-3 py-3">Debt</th>
                <th className="text-right px-3 py-3">LTV</th>
                <th className="text-right px-3 py-3">Occupancy</th>
                <th className="text-center px-3 py-3">Covenant</th>
                <th className="text-right px-3 py-3">Refi Date</th>
                <th className="text-center px-3 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {assetDebt.map((asset, i) => {
                const loan = asset.primaryLoan;
                const monthsToRefi = asset.refinancingDate
                  ? Math.ceil(
                      (new Date(asset.refinancingDate).getTime() -
                        Date.now()) /
                        (1000 * 60 * 60 * 24 * 30)
                    )
                  : null;

                return (
                  <tr
                    key={asset.id}
                    className={`table-row-hover border-b border-[var(--color-border)] last:border-0 ${
                      i % 2 === 1 ? "bg-[var(--color-slate-50)/50]" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <Link href={`/assets/${asset.id}`}>
                        <div className="flex items-start gap-2.5">
                          <span className="text-lg leading-none mt-0.5">
                            {countryFlag(asset.country)}
                          </span>
                          <div>
                            <p className="font-semibold text-sm text-[var(--color-text-primary)] hover:text-[var(--color-navy-700)]">
                              {asset.name}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              {asset.nameJa}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {asset.city} · {countryName(asset.country)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {assetTypeLabel(asset.assetType)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`badge ${assetStatusBadgeClass(
                          asset.status
                        )}`}
                      >
                        {assetStatusLabel(asset.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm font-semibold">
                        {formatMillions(
                          asset.currentValuation ?? 0,
                          asset.currency
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {asset.currency}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      <p className="text-sm">
                        {asset.totalDebt > 0
                          ? formatMillions(asset.totalDebt, asset.currency)
                          : "—"}
                      </p>
                      {loan && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {loan.lenderName.split(" ")[0]}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
                      {loan?.ltv ? (
                        <span
                          className={`text-sm font-medium ${
                            loan.ltv <= 55
                              ? "text-[var(--color-status-green)]"
                              : loan.ltv <= 65
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {formatPercent(loan.ltv)}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-numeric">
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
                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`badge ${covenantBadgeClass(
                          asset.covenantStatus
                        )}`}
                      >
                        {covenantLabel(asset.covenantStatus)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      {asset.refinancingDate ? (
                        <div>
                          <p className="text-sm font-numeric font-medium">
                            {formatDate(asset.refinancingDate, "short")}
                          </p>
                          {monthsToRefi !== null && (
                            <p
                              className={`text-xs ${
                                monthsToRefi <= 12
                                  ? "text-[var(--color-status-red)]"
                                  : monthsToRefi <= 18
                                  ? "text-[var(--color-status-amber)]"
                                  : "text-[var(--color-text-muted)]"
                              }`}
                            >
                              {monthsToRefi}mo
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">—</span>
                      )}
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
          </table>
        </div>
      </div>
    </div>
  );
}
