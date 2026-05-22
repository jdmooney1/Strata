import type { Metadata } from "next";
import { FileText, Upload, Search, Sparkles } from "lucide-react";
import {
  MOCK_DOCUMENTS,
  MOCK_ASSETS,
} from "@/lib/mock-data";
import {
  formatDate,
  docTypeLabel,
  countryFlag,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Documents" };

const DOC_STATUS_CLASS: Record<string, string> = {
  PENDING:    "badge-gray",
  PROCESSING: "badge-blue",
  EXTRACTED:  "badge-green",
  REVIEWED:   "badge-navy",
  ARCHIVED:   "badge-gray",
  ERROR:      "badge-red",
};

export default function DocumentsPage() {
  const assetsMap = Object.fromEntries(MOCK_ASSETS.map((a) => [a.id, a]));

  const pendingExtraction = MOCK_DOCUMENTS.filter(
    (d) => d.status === "PENDING" || d.status === "PROCESSING"
  ).length;

  const extractedCount = MOCK_DOCUMENTS.filter(
    (d) => d.status === "EXTRACTED" || d.status === "REVIEWED"
  ).length;

  const expiringSoon = MOCK_DOCUMENTS.filter((d) => {
    if (!d.expiresAt) return false;
    const days =
      (new Date(d.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 90 && days > 0;
  }).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Document Intelligence</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            ドキュメント・インテリジェンス — AI-powered extraction and analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--color-border)] rounded-md bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)] transition-colors">
            <Search className="size-3.5" />
            Search Docs
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white transition-colors" style={{ background: "var(--color-navy-700)" }}>
            <Upload className="size-3.5" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Documents", labelJa: "総文書数", value: MOCK_DOCUMENTS.length, color: "" },
          { label: "AI Extracted", labelJa: "AI抽出済み", value: extractedCount, color: "text-[var(--color-status-green)]" },
          { label: "Pending Extraction", labelJa: "抽出待ち", value: pendingExtraction, color: pendingExtraction > 0 ? "text-[var(--color-status-amber)]" : "" },
          { label: "Expiring < 90 Days", labelJa: "90日以内期限切れ", value: expiringSoon, color: expiringSoon > 0 ? "text-[var(--color-status-amber)]" : "" },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className={`text-2xl font-semibold font-numeric mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* AI Extraction Info */}
      <div className="ai-insight flex items-start gap-3">
        <Sparkles className="size-4 mt-0.5 text-[var(--color-navy-500)] flex-shrink-0" />
        <div>
          <p className="ai-insight-label">How Document Intelligence Works</p>
          <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
            Upload any document — loan agreements, leases, PM reports, valuations, invoices — and the AI engine
            automatically extracts key dates, obligations, covenants, parties, and financial terms. Extracted data
            is linked to assets and generates automatic task and alert triggers for upcoming deadlines.
          </p>
        </div>
      </div>

      {/* Document Table */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">Document Register</h2>
          <span className="badge badge-gray">{MOCK_DOCUMENTS.length} documents</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                <th className="text-left px-4 py-3">Document</th>
                <th className="text-left px-3 py-3">Asset</th>
                <th className="text-left px-3 py-3">Type</th>
                <th className="text-left px-3 py-3">Parties</th>
                <th className="text-right px-3 py-3">Effective</th>
                <th className="text-right px-3 py-3">Expires</th>
                <th className="text-left px-3 py-3">AI Summary</th>
                <th className="text-center px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DOCUMENTS.map((doc, i) => {
                const asset = doc.assetId ? assetsMap[doc.assetId] : null;
                const daysToExpiry = doc.expiresAt
                  ? Math.ceil(
                      (new Date(doc.expiresAt).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;

                return (
                  <tr
                    key={doc.id}
                    className={`table-row-hover border-b border-[var(--color-border)] last:border-0 ${
                      i % 2 === 1 ? "bg-[var(--color-slate-50)/30]" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-2">
                        <FileText className="size-4 text-[var(--color-navy-400)] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold leading-tight">{doc.name}</p>
                          {doc.nameJa && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{doc.nameJa}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {doc.tags.map((tag) => (
                              <span key={tag} className="badge badge-navy">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      {asset ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{countryFlag(asset.country)}</span>
                          <span className="text-xs text-[var(--color-text-secondary)] leading-tight">
                            {asset.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">Portfolio</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="badge badge-gray text-xs">{docTypeLabel(doc.docType)}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="space-y-0.5">
                        {doc.parties.slice(0, 2).map((p) => (
                          <p key={p} className="text-xs text-[var(--color-text-secondary)] leading-tight truncate max-w-[140px]">{p}</p>
                        ))}
                        {doc.parties.length > 2 && (
                          <p className="text-xs text-[var(--color-text-muted)]">+{doc.parties.length - 2} more</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs font-numeric text-[var(--color-text-secondary)]">
                      {formatDate(doc.effectiveDate, "short")}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      {doc.expiresAt ? (
                        <div>
                          <p className="text-xs font-numeric">{formatDate(doc.expiresAt, "short")}</p>
                          {daysToExpiry !== null && daysToExpiry <= 90 && (
                            <p className={`text-xs font-semibold ${daysToExpiry <= 30 ? "text-[var(--color-status-red)]" : "text-[var(--color-status-amber)]"}`}>
                              {daysToExpiry}d
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 max-w-xs">
                      {doc.aiSummary ? (
                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                          {doc.aiSummary}
                        </p>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)] italic">
                          {doc.status === "PENDING" ? "Awaiting extraction" : "No summary"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`badge ${DOC_STATUS_CLASS[doc.status] ?? "badge-gray"}`}>
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-[var(--color-border-strong)] rounded-lg p-8 text-center">
        <Upload className="size-8 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Upload documents for AI extraction</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          PDF, Excel, Word — loan agreements, leases, PM reports, valuations, invoices
        </p>
        <button className="mt-4 px-4 py-2 text-xs font-semibold rounded-md text-white transition-colors" style={{ background: "var(--color-navy-700)" }}>
          Choose Files
        </button>
      </div>
    </div>
  );
}
