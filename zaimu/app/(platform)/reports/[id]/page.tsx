import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  FileBarChart,
  ListChecks,
  Lightbulb,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, countryFlag } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = await db.report.findUnique({ where: { id }, select: { title: true } });
  return { title: report?.title ?? "Report" };
}

// ── Type helpers ─────────────────────────────────────────────────────────────

interface ReportSection {
  id?: string;
  title?: string;
  content?: string;
  status?: string;
  flags?: string[];
  // Legacy fields kept for backwards compatibility with older reports
  heading?: string;
  headingJa?: string;
  body?: string;
  bodyJa?: string;
}

interface NextAction {
  action?: string;
  owner?: string;
  dueDate?: string;
}

interface ReportContent {
  title?: string;
  overallStatus?: string;
  overallStatusReason?: string;
  sections?: ReportSection[];
  requiredDecisions?: Array<string | { decision?: string; rationale?: string }>;
  nextActions?: Array<string | NextAction>;
  dataGaps?: string[];
}

const OVERALL_STATUS_CONFIG: Record<
  string,
  { dot: string; label: string; badgeCls: string }
> = {
  GREEN: {
    dot: "bg-[var(--color-status-green)]",
    label: "Green — No immediate issues",
    badgeCls: "badge-green",
  },
  AMBER: {
    dot: "bg-[var(--color-status-amber)]",
    label: "Amber — Monitoring required",
    badgeCls: "badge-amber",
  },
  RED: {
    dot: "bg-[var(--color-status-red)]",
    label: "Red — Action required",
    badgeCls: "badge-red",
  },
};

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  DRAFT:      { cls: "badge-gray",  label: "Draft" },
  GENERATING: { cls: "badge-blue",  label: "Generating" },
  REVIEW:     { cls: "badge-amber", label: "In Review" },
  APPROVED:   { cls: "badge-navy",  label: "Approved" },
  PUBLISHED:  { cls: "badge-green", label: "Published" },
  ARCHIVED:   { cls: "badge-gray",  label: "Archived" },
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  MONTHLY_BOARD:    "Monthly Board Report",
  QUARTERLY_REVIEW: "Quarterly Review",
  ANNUAL_SUMMARY:   "Annual Summary",
  REFINANCING_MEMO: "Refinancing Memo",
  RISK_SUMMARY:     "Risk Summary",
  INVESTMENT_UPDATE:"Investment Update",
  CASH_FLOW_FORECAST: "Cash Flow Forecast",
  COVENANT_REPORT:  "Covenant Report",
  FX_EXPOSURE:      "FX Exposure Report",
  CUSTOM:           "Custom Report",
};

// ── Page ─────────────────────────────────────────────────────────────────────

async function ReportDetailContent({ id }: { id: string }) {
  const report = await db.report.findUnique({
    where: { id },
    include: {
      assets: {
        include: { asset: { select: { id: true, name: true, country: true } } },
      },
    },
  });

  if (!report) notFound();

  const content = report.content as ReportContent | null;
  const overallStatus = content?.overallStatus ?? "GREEN";
  const osCfg = OVERALL_STATUS_CONFIG[overallStatus] ?? OVERALL_STATUS_CONFIG.GREEN;
  const statusCfg = STATUS_CONFIG[report.status] ?? { cls: "badge-gray", label: report.status };
  const sections = Array.isArray(content?.sections) ? (content.sections as ReportSection[]) : [];
  const requiredDecisions = Array.isArray(content?.requiredDecisions)
    ? content.requiredDecisions
    : [];
  const nextActions = Array.isArray(content?.nextActions)
    ? content.nextActions
    : [];
  const dataGaps = Array.isArray(content?.dataGaps)
    ? (content.dataGaps as string[])
    : [];

  const formatDecision = (d: string | { decision?: string; rationale?: string }): string => {
    if (typeof d === "string") return d;
    if (d && typeof d === "object") {
      const text = d.decision ?? "";
      return d.rationale ? `${text} — ${d.rationale}` : text;
    }
    return "";
  };

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to Report Archive
      </Link>

      {/* Report header */}
      <div className="data-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`size-3 rounded-full mt-1.5 flex-shrink-0 ${osCfg.dot}`} />
            <div>
              <h1 className="text-lg font-semibold leading-tight">{report.title}</h1>
              {report.titleJa && (
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{report.titleJa}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`badge ${statusCfg.cls}`}>{statusCfg.label}</span>
                <span className="badge badge-gray">
                  {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
                </span>
                <span className="badge badge-gray">
                  {report.language === "ja" ? "日本語" : "English"}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Period: {formatDate(report.period.toISOString(), "medium")}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {report.generatedAt && (
              <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 justify-end">
                <Sparkles className="size-3" />
                Generated {formatDate(report.generatedAt.toISOString(), "medium")}
              </p>
            )}
            {report.finalizedAt && (
              <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 justify-end mt-1">
                <CheckCircle className="size-3" />
                Approved {formatDate(report.finalizedAt.toISOString(), "medium")}
              </p>
            )}
          </div>
        </div>

        {/* Assets covered */}
        {report.assets.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <p className="section-label mb-2">Assets Covered</p>
            <div className="flex flex-wrap gap-2">
              {report.assets.map((ra) => (
                <Link
                  key={ra.id}
                  href={`/assets/${ra.asset.id}`}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-navy-700)] hover:underline"
                >
                  <span>{countryFlag(ra.asset.country)}</span>
                  <span>{ra.asset.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Overall status */}
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <p className="section-label">Overall Status:</p>
            <span className={`badge ${osCfg.badgeCls}`}>{osCfg.label}</span>
          </div>
          {typeof content?.overallStatusReason === "string" && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
              {content.overallStatusReason}
            </p>
          )}
        </div>
      </div>

      {/* Report sections */}
      {sections.length > 0 && (
        <div className="space-y-4">
          <p className="section-label">Report Sections</p>
          {sections.map((section, i) => {
            const heading = section.title ?? section.heading ?? `Section ${i + 1}`;
            const body = section.content ?? section.body ?? "";
            return (
              <div key={i} className="data-card">
                <div className="data-card-header">
                  <h2 className="text-sm font-semibold">{heading}</h2>
                  {section.status && (
                    <span
                      className={`badge ${
                        section.status === "GREEN"
                          ? "badge-green"
                          : section.status === "AMBER"
                          ? "badge-amber"
                          : section.status === "RED"
                          ? "badge-red"
                          : "badge-gray"
                      }`}
                    >
                      {section.status}
                    </span>
                  )}
                </div>
                <div className="data-card-body space-y-3">
                  {section.headingJa && (
                    <p className="text-xs text-[var(--color-text-muted)]">{section.headingJa}</p>
                  )}
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
                    {body}
                  </p>
                  {section.bodyJa && (
                    <div className="pt-3 border-t border-[var(--color-border)]">
                      <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">日本語</p>
                      <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
                        {section.bodyJa}
                      </p>
                    </div>
                  )}
                  {Array.isArray(section.flags) && section.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--color-border)]">
                      {section.flags.map((flag, fi) => (
                        <span key={fi} className="badge badge-amber">{flag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Three-column action area */}
      {(requiredDecisions.length > 0 || nextActions.length > 0 || dataGaps.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Required decisions */}
          {requiredDecisions.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4 text-[var(--color-navy-500)]" />
                  <h2 className="text-sm font-semibold">Required Decisions</h2>
                </div>
              </div>
              <ul className="data-card-body space-y-2">
                {requiredDecisions.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
                    <span className="text-[var(--color-navy-500)] font-semibold mt-0.5">{i + 1}.</span>
                    <span>{formatDecision(d)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next actions */}
          {nextActions.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-[var(--color-navy-500)]" />
                  <h2 className="text-sm font-semibold">Next Actions</h2>
                </div>
              </div>
              <ul className="data-card-body space-y-2.5">
                {nextActions.map((a, i) => {
                  if (typeof a === "string") {
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
                        <span className="text-[var(--color-status-green)] mt-0.5">→</span>
                        <span>{a}</span>
                      </li>
                    );
                  }
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
                      <span className="text-[var(--color-status-green)] mt-0.5">→</span>
                      <div className="flex-1">
                        <p>{a.action ?? ""}</p>
                        {(a.owner || a.dueDate) && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {a.owner && <span>Owner: {a.owner}</span>}
                            {a.owner && a.dueDate && <span> · </span>}
                            {a.dueDate && <span>Due: {a.dueDate}</span>}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Data gaps */}
          {dataGaps.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-[var(--color-status-amber)]" />
                  <h2 className="text-sm font-semibold">Data Gaps</h2>
                </div>
              </div>
              <ul className="data-card-body space-y-2">
                {dataGaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                    <AlertTriangle className="size-3 text-[var(--color-status-amber)] flex-shrink-0 mt-1" />
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty content fallback */}
      {!content && (
        <div className="data-card p-10 text-center">
          <FileBarChart className="size-8 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            Report content not yet generated
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Use the Generate button on the Reports page to run AI generation for this report
          </p>
        </div>
      )}
    </div>
  );
}

function ReportDetailLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 bg-[var(--color-slate-100)] rounded w-32" />
      <div className="data-card p-5">
        <div className="h-6 bg-[var(--color-slate-100)] rounded w-64 mb-3" />
        <div className="h-4 bg-[var(--color-slate-100)] rounded w-48" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="data-card p-4">
          <div className="h-4 bg-[var(--color-slate-100)] rounded w-40 mb-3" />
          <div className="h-3 bg-[var(--color-slate-100)] rounded w-full mb-2" />
          <div className="h-3 bg-[var(--color-slate-100)] rounded w-4/5" />
        </div>
      ))}
    </div>
  );
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<ReportDetailLoading />}>
      <ReportDetailContent id={id} />
    </Suspense>
  );
}
