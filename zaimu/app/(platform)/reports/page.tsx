import type { Metadata } from "next";
import Link from "next/link";
import {
  FileBarChart,
  Plus,
  Sparkles,
  Clock,
  CheckCircle,
  FileText,
} from "lucide-react";
import { MOCK_REPORTS, MOCK_ASSETS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Board Reports" };

const REPORT_TYPE_LABELS: Record<string, string> = {
  MONTHLY_BOARD:     "Monthly Board Report",
  QUARTERLY_REVIEW:  "Quarterly Review",
  ANNUAL_SUMMARY:    "Annual Summary",
  REFINANCING_MEMO:  "Refinancing Memo",
  RISK_SUMMARY:      "Risk Summary",
  INVESTMENT_UPDATE: "Investment Update",
  CASH_FLOW_FORECAST: "Cash Flow Forecast",
  COVENANT_REPORT:   "Covenant Report",
  FX_EXPOSURE:       "FX Exposure Report",
  CUSTOM:            "Custom Report",
};

const STATUS_CONFIG: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  DRAFT:      { cls: "badge-gray",   label: "Draft",      icon: null },
  GENERATING: { cls: "badge-blue",   label: "Generating", icon: null },
  REVIEW:     { cls: "badge-amber",  label: "In Review",  icon: null },
  APPROVED:   { cls: "badge-navy",   label: "Approved",   icon: null },
  PUBLISHED:  { cls: "badge-green",  label: "Published",  icon: null },
  ARCHIVED:   { cls: "badge-gray",   label: "Archived",   icon: null },
};

export default function ReportsPage() {
  const published = MOCK_REPORTS.filter((r) => r.status === "PUBLISHED");
  const inReview  = MOCK_REPORTS.filter((r) => r.status === "REVIEW");
  const drafts    = MOCK_REPORTS.filter((r) => r.status === "DRAFT" || r.status === "GENERATING");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Board Reporting Engine</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            取締役会報告エンジン — AI-generated institutional reports in Japanese
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white transition-colors" style={{ background: "var(--color-navy-700)" }}>
          <Plus className="size-3.5" />
          Generate Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Reports",   labelJa: "総報告書数",   value: MOCK_REPORTS.length, color: "" },
          { label: "In Review",       labelJa: "レビュー中",   value: inReview.length,     color: inReview.length > 0 ? "text-[var(--color-status-amber)]" : "" },
          { label: "Drafts",          labelJa: "下書き",       value: drafts.length,       color: "" },
          { label: "Published",       labelJa: "発行済み",     value: published.length,    color: "text-[var(--color-status-green)]" },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className={`text-2xl font-semibold font-numeric mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* AI Reporting info */}
      <div className="ai-insight">
        <p className="ai-insight-label">AI Board Reporting — How It Works</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 mt-2">
          {[
            {
              step: "01",
              title: "Data Aggregation",
              desc: "System automatically pulls PM reports, loan statements, covenant tests, FX rates, and valuation data for the reporting period.",
            },
            {
              step: "02",
              title: "AI Draft Generation",
              desc: "Claude generates institutional Japanese commentary for each asset and portfolio-level executive summary, risk flags, and recommended actions.",
            },
            {
              step: "03",
              title: "Review & Approve",
              desc: "Portfolio manager reviews AI draft, edits commentary, and submits for board approval. Final report published as PDF in Japanese.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <span className="text-lg font-bold text-[var(--color-navy-300)] font-numeric leading-tight flex-shrink-0">
                {item.step}
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--color-navy-700)]">{item.title}</p>
                <p className="text-xs text-[var(--color-navy-900)] mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Generate Form (static) */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--color-navy-500)]" />
            <h2 className="text-sm font-semibold">Generate New Report</h2>
          </div>
        </div>
        <div className="data-card-body">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <label className="section-label block mb-1.5">Report Type</label>
              <select className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-navy-400)]">
                {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1.5">Period</label>
              <input
                type="month"
                defaultValue="2026-05"
                className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]"
              />
            </div>
            <div>
              <label className="section-label block mb-1.5">Output Language</label>
              <select className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]">
                <option value="ja">日本語 (Japanese)</option>
                <option value="en">English</option>
                <option value="both">Bilingual (JA / EN)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md text-white transition-colors" style={{ background: "var(--color-navy-700)" }}>
              <Sparkles className="size-3.5" />
              Generate with AI
            </button>
            <p className="text-xs text-[var(--color-text-muted)]">
              Estimated generation time: 45–90 seconds
            </p>
          </div>
        </div>
      </div>

      {/* Report History */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">Report History</h2>
          <span className="badge badge-gray">{MOCK_REPORTS.length} reports</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                <th className="text-left px-4 py-3">Report</th>
                <th className="text-left px-3 py-3">Type</th>
                <th className="text-left px-3 py-3">Period</th>
                <th className="text-left px-3 py-3">Language</th>
                <th className="text-right px-3 py-3">Generated</th>
                <th className="text-center px-3 py-3">Status</th>
                <th className="text-right px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_REPORTS.map((report, i) => {
                const cfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.DRAFT;
                return (
                  <tr
                    key={report.id}
                    className={`table-row-hover border-b border-[var(--color-border)] last:border-0 ${
                      i % 2 === 1 ? "bg-[var(--color-slate-50)/30]" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-2">
                        <FileBarChart className="size-4 text-[var(--color-navy-400)] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold leading-tight">{report.title}</p>
                          {report.titleJa && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{report.titleJa}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="badge badge-navy text-xs">
                        {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-sm font-numeric text-[var(--color-text-secondary)]">
                      {formatDate(report.period, "short")}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="badge badge-gray">
                        {report.language === "ja" ? "日本語" : "English"}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs font-numeric text-[var(--color-text-secondary)]">
                      {report.generatedAt ? formatDate(report.generatedAt, "medium") : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {report.status === "REVIEW" && (
                          <button className="text-xs font-medium px-2 py-1 rounded border border-[var(--color-navy-300)] text-[var(--color-navy-700)] hover:bg-[var(--color-navy-50)] transition-colors">
                            Approve
                          </button>
                        )}
                        {(report.status === "PUBLISHED" || report.status === "APPROVED") && (
                          <button className="text-xs font-medium px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)] transition-colors">
                            Download PDF
                          </button>
                        )}
                        {report.status === "DRAFT" && (
                          <button className="text-xs font-medium px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)] transition-colors">
                            Continue Editing
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample report structure */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">Monthly Board Report — Structure</h2>
          <span className="text-xs text-[var(--color-text-muted)]">月次取締役会報告書の構成</span>
        </div>
        <div className="data-card-body">
          <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
            {[
              "01. Executive Summary (概要)",
              "02. Portfolio Performance Overview (ポートフォリオ実績)",
              "03. Asset-by-Asset Update (物件別更新)",
              "04. Covenant Compliance Report (コベナンツ報告)",
              "05. FX Exposure & Hedging Status (為替エクスポージャー)",
              "06. Cash Flow Summary (キャッシュフロー概要)",
              "07. Capital Events & Refinancing Pipeline (資本イベント)",
              "08. Operational Risk Flags (オペレーショナルリスク)",
              "09. Upcoming Obligations (今後の義務)",
              "10. Recommended Actions (推奨アクション)",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 py-1.5 border-b border-[var(--color-border)] last:border-0">
                <div className="size-1.5 rounded-full bg-[var(--color-navy-400)] flex-shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
