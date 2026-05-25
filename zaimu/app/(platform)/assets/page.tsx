import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { db } from "@/lib/db";
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
export const dynamic = "force-dynamic";

async function AssetsContent() {
  const assets = await db.asset.findMany({
    where: { orgId: "org_sanyo_001" },
    include: {
      loans: {
        select: {
          id: true,
          lenderName: true,
          currentBalance: true,
          currency: true,
          maturityDate: true,
          ltv: true,
          status: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Attach computed debt fields
  const assetRows = assets.map((asset) => {
    const activeLoans = asset.loans.filter((l) => l.status === "CURRENT" || l.status === "WATCH");
    const totalDebt = activeLoans.reduce(
      (sum, l) => sum + Number(l.currentBalance),
      0
    );
    const primaryLoan = activeLoans[0] ?? null;
    return { ...asset, totalDebt, primaryLoan };
  });

  const totalAum = assets.reduce(
    (sum, a) => sum + Number(a.currentValuation ?? 0),
    0
  );
  const countries = new Set(assets.map((a) => a.country));
  const avgOccupancy =
    assets.length > 0
      ? assets.reduce((s, a) => s + Number(a.occupancyRate ?? 0), 0) /
        assets.length
      : 0;
  const covenantIssues = assets.filter(
    (a) => a.covenantStatus === "BREACH" || a.covenantStatus === "WATCH"
  ).length;
  const refiDue = assets.filter((a) => {
    if (!a.refinancingDate) return false;
    const m =
      (a.refinancingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    return m <= 18;
  }).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Asset Register</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            アセット台帳 — {assets.length} asset
            {assets.length !== 1 ? "s" : ""} across {countries.size}{" "}
            jurisdiction{countries.size !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {[
          { label: "Total Assets",    labelJa: "総資産数",        value: assets.length.toString(), alert: false },
          { label: "Portfolio AUM",   labelJa: "総資産規模",      value: `$${(totalAum / 1e9).toFixed(2)}B`, note: "blended USD eq.", alert: false },
          { label: "Countries",       labelJa: "国数",            value: countries.size.toString(), alert: false },
          { label: "Avg Occupancy",   labelJa: "平均稼働率",      value: formatPercent(avgOccupancy), alert: false },
          { label: "Covenant Issues", labelJa: "コベナンツ問題",  value: covenantIssues.toString(), alert: covenantIssues > 0 },
          { label: "Refi Due < 18mo", labelJa: "18ヶ月以内満期",  value: refiDue.toString(), alert: refiDue > 0 },
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
            {"note" in s && s.note && (
              <p className="text-xs text-[var(--color-text-muted)]">{s.note}</p>
            )}
          </div>
        ))}
      </div>

      {/* Asset table */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">All Assets</h2>
          <span className="badge badge-gray">{assets.length} assets</span>
        </div>

        {assets.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="size-8 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              No assets yet
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Add your first asset to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Asset / Location</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Type</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Status</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Valuation</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Debt</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">LTV</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Occupancy</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Covenant</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Refi Date</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Score</th>
                </tr>
              </thead>
              <tbody>
                {assetRows.map((asset, i) => {
                  const loan = asset.primaryLoan;
                  const ltvNum = loan?.ltv != null ? Number(loan.ltv) : null;
                  const occupancyNum = Number(asset.occupancyRate ?? 0);
                  const monthsToRefi = asset.refinancingDate
                    ? Math.ceil(
                        (asset.refinancingDate.getTime() - Date.now()) /
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
                              {asset.nameJa && (
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                  {asset.nameJa}
                                </p>
                              )}
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
                        <span className={`badge ${assetStatusBadgeClass(asset.status)}`}>
                          {assetStatusLabel(asset.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-numeric">
                        <p className="text-sm font-semibold">
                          {formatMillions(
                            Number(asset.currentValuation ?? 0),
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
                        {ltvNum != null ? (
                          <span
                            className={`text-sm font-medium ${
                              ltvNum <= 55
                                ? "text-[var(--color-status-green)]"
                                : ltvNum <= 65
                                ? "text-[var(--color-status-amber)]"
                                : "text-[var(--color-status-red)]"
                            }`}
                          >
                            {formatPercent(ltvNum)}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right font-numeric">
                        <span
                          className={`text-sm font-medium ${
                            occupancyNum >= 90
                              ? "text-[var(--color-status-green)]"
                              : occupancyNum >= 75
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {formatPercent(occupancyNum)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`badge ${covenantBadgeClass(asset.covenantStatus)}`}>
                          {covenantLabel(asset.covenantStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        {asset.refinancingDate ? (
                          <div>
                            <p className="text-sm font-numeric font-medium">
                              {formatDate(asset.refinancingDate.toISOString(), "short")}
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
                          <span className={`score-ring ${scoreClass(asset.operationalScore)}`}>
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
        )}
      </div>
    </div>
  );
}

function AssetsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-[var(--color-slate-100)] rounded w-48" />
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="data-card p-3">
            <div className="h-3 bg-[var(--color-slate-100)] rounded w-16 mb-2" />
            <div className="h-6 bg-[var(--color-slate-100)] rounded w-10" />
          </div>
        ))}
      </div>
      <div className="data-card p-8 text-center">
        <div className="h-4 bg-[var(--color-slate-100)] rounded w-40 mx-auto" />
      </div>
    </div>
  );
}

export default function AssetsPage() {
  return (
    <Suspense fallback={<AssetsLoading />}>
      <AssetsContent />
    </Suspense>
  );
}
