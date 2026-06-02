import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { FileBarChart, CheckCircle, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, formatRelative } from "@/lib/utils";
import { ReportGenerator } from "./report-generator";

export const metadata: Metadata = { title: "Board Reports" };
export const dynamic = "force-dynamic";

const REPORT_TYPE_LABELS: Record<string, string> = {
  MONTHLY_BOARD:    "Monthly Board Report",
  QUARTERLY_REVIEW: "Quarterly Review",
  ANNUAL_SUMMARY:   "Annual Summary",
  REFINANCING_MEMO: "Refinancing Memo",
  RISK_SUMMARY:     "Risk Summary",
  INVESTMENT_UPDATE:"Investment Update",
  CASH_FLOW_FORECAST:"Cash Flow Forecast",
  COVENANT_REPORT:  "Covenant Report",
  FX_EXPOSURE:      "FX Exposure Report",
  CUSTOM:           "Custom Report",
};

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  DRAFT:      { cls: "badge-gray",  label: "Draft" },
  GENERATING: { cls: "badge-blue",  label: "Generating" },
  REVIEW:     { cls: "badge-amber", label: "In Review" },
  APPROVED:   { cls: "badge-navy",  label: "Approved" },
  PUBLISHED:  { cls: "badge-green", label: "Published" },
  ARCHIVED:   { cls: "badge-gray",  label: "Archived" },
};

const OVERALL_DOT: Record<string, string> = {
  GREEN: "bg-[var(--color-status-green)]",
  AMBER: "bg-[var(--color-status-amber)]",
  RED:   "bg-[var(--color-status-red)]",
};

async function ReportsContent() {
  const reports = await db.report.findMany({
    where: { orgId: "org_sanyo_001" },
    orderBy: { createdAt: "desc" },
    include: {
      assets: { include: { asset: { select: { name: true, country: true } } } },
    },
  });

  const published = reports.filter(r => r.status === "PUBLISHED").length;
  const inReview  = reports.filter(r => r.status === "REVIEW").length;
  const total     = reports.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Board Reports</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            取締役会報告 — Institutional report generation
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] flex-shrink-0">
          <span>
            <span className="font-numeric font-semibold text-[var(--color-text-primary)]">{total}</span>
            {" "}total
          </span>
          {published > 0 && (
            <span>
              <span className="font-numeric font-semibold" style={{ color: "var(--color-status-green)" }}>{published}</span>
              {" "}published
            </span>
          )}
          {inReview > 0 && (
            <span>
              <span className="font-numeric font-semibold" style={{ color: "var(--color-status-amber)" }}>{inReview}</span>
              {" "}in review
            </span>
          )}
        </div>
      </div>

      {/* Context block */}
      <div className="ai-insight">
        <p className="ai-insight-label">Report Generation</p>
        <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
          Select an asset, report type, and period. The system reads the asset&apos;s live data — debt,
          covenants, leases, documents, FX rates — and generates a formal institutional report in Japanese
          or English. All assertions are sourced; data gaps are flagged explicitly.
        </p>
      </div>

      <ReportGenerator orgId="org_sanyo_001" />

      {/* Archive */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">Report Archive</h2>
          <span className="badge badge-gray">{total}</span>
        </div>

        {reports.length === 0 ? (
          <div className="p-10 text-center">
            <FileBarChart className="size-8 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">No reports yet</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Use the generator above to create your first board report
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {reports.map(report => {
              const content = report.content as Record<string, unknown> | null;
              const overallStatus = (content?.overallStatus as string) ?? "GREEN";
              const dotClass = OVERALL_DOT[overallStatus] ?? OVERALL_DOT.GREEN;
              const statusCfg = STATUS_CONFIG[report.status] ?? { cls: "badge-gray", label: report.status };
              const assetNames = report.assets.map(a => a.asset.name).join(", ");

              return (
                <div key={report.id} className="px-4 py-4 table-row-hover">
                  <div className="flex items-start gap-3">
                    <div
                      className={`size-2.5 mt-1.5 flex-shrink-0 ${dotClass}`}
                      style={{ borderRadius: "1px" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/reports/${report.id}`}
                            className="text-sm font-semibold leading-tight hover:text-[var(--color-navy-700)] hover:underline"
                          >
                            {report.title}
                          </Link>
                          {assetNames && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{assetNames}</p>
                          )}
                        </div>
                        <span className={`badge flex-shrink-0 ${statusCfg.cls}`}>{statusCfg.label}</span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="badge badge-gray">
                          {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          Period: {formatDate(report.period.toISOString(), "medium")}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {report.language === "ja" ? "日本語" : "English"}
                        </span>
                      </div>

                      {typeof content?.overallStatusReason === "string" && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
                          {content.overallStatusReason}
                        </p>
                      )}

                      {Array.isArray(content?.dataGaps) && (content.dataGaps as string[]).length > 0 && (
                        <div className="mt-1.5 flex items-start gap-1">
                          <AlertTriangle className="size-3 text-[var(--color-status-amber)] flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-[var(--color-status-amber)]">
                            {(content.dataGaps as string[]).length} data gaps flagged
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 ml-[22px]">
                    {report.generatedAt && (
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <CheckCircle className="size-3" />
                        Generated {formatRelative(report.generatedAt)}
                      </span>
                    )}
                    {report.finalizedAt && (
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <CheckCircle className="size-3" />
                        Approved {formatRelative(report.finalizedAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-[var(--color-slate-100)] rounded w-64" />
      <div className="data-card p-8 text-center">
        <div className="h-4 bg-[var(--color-slate-100)] rounded w-40 mx-auto" />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsLoading />}>
      <ReportsContent />
    </Suspense>
  );
}
