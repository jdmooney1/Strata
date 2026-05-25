import type { Metadata } from "next";
import { Suspense } from "react";
import { FileText, Sparkles, AlertTriangle, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, docTypeLabel, countryFlag } from "@/lib/utils";
import { DocumentUploadSection } from "./upload-section";

export const metadata: Metadata = { title: "Documents" };

const DOC_STATUS_CLASS: Record<string, string> = {
  PENDING:    "badge-gray",
  PROCESSING: "badge-blue",
  EXTRACTED:  "badge-green",
  REVIEWED:   "badge-navy",
  ARCHIVED:   "badge-gray",
  ERROR:      "badge-red",
};

async function DocumentsContent() {
  const documents = await db.document.findMany({
    orderBy: { uploadedAt: "desc" },
    include: {
      asset: { select: { id: true, name: true, country: true } },
      extractedFacts: { select: { id: true, category: true, flagged: true } },
    },
  });

  const totalDocs = documents.length;
  const extractedCount = documents.filter(
    (d) => d.status === "EXTRACTED" || d.status === "REVIEWED"
  ).length;
  const pendingCount = documents.filter(
    (d) => d.status === "PENDING" || d.status === "PROCESSING"
  ).length;
  const expiringSoon = documents.filter((d) => {
    if (!d.expiresAt) return false;
    const days = (d.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total Documents",
            labelJa: "総文書数",
            value: totalDocs,
            color: "",
          },
          {
            label: "AI Extracted",
            labelJa: "AI抽出済み",
            value: extractedCount,
            color: "text-[var(--color-status-green)]",
          },
          {
            label: "Pending Extraction",
            labelJa: "抽出待ち",
            value: pendingCount,
            color: pendingCount > 0 ? "text-[var(--color-status-amber)]" : "",
          },
          {
            label: "Expiring < 90 Days",
            labelJa: "90日以内期限切れ",
            value: expiringSoon,
            color: expiringSoon > 0 ? "text-[var(--color-status-amber)]" : "",
          },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className={`text-2xl font-semibold font-numeric mt-1 ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="ai-insight flex items-start gap-3">
        <Sparkles className="size-4 mt-0.5 text-[var(--color-navy-500)] flex-shrink-0" />
        <div>
          <p className="ai-insight-label">How Document Intelligence Works</p>
          <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
            Upload any document — loan agreements, leases, PM reports,
            valuations — and the AI engine automatically extracts key dates,
            obligations, covenants, parties, and financial terms. Extracted
            data is linked to assets and generates automatic task and alert
            triggers.
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <DocumentUploadSection orgId="org_sanyo_001" />

      {/* Document Register */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="text-sm font-semibold">Document Register</h2>
          <span className="badge badge-gray">{totalDocs} documents</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="size-8 text-[var(--color-text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              No documents yet
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Upload a document above to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Document
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Asset
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Type
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                    AI Summary
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Facts
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Expires
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, i) => {
                  const daysToExpiry = doc.expiresAt
                    ? Math.ceil(
                        (doc.expiresAt.getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;
                  const flaggedFacts = doc.extractedFacts.filter(
                    (f) => f.flagged
                  ).length;

                  return (
                    <tr
                      key={doc.id}
                      className={`table-row-hover border-b border-[var(--color-border)] last:border-0 ${
                        i % 2 === 1 ? "bg-[var(--color-slate-50)/30]" : ""
                      }`}
                    >
                      {/* Document Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2">
                          <FileText className="size-4 text-[var(--color-navy-400)] mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold leading-tight">
                              {doc.name}
                            </p>
                            {doc.nameJa && (
                              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                {doc.nameJa}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {doc.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="badge badge-navy">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Asset */}
                      <td className="px-3 py-3.5">
                        {doc.asset ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">
                              {countryFlag(doc.asset.country)}
                            </span>
                            <span className="text-xs text-[var(--color-text-secondary)] leading-tight truncate max-w-[120px]">
                              {doc.asset.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            Portfolio
                          </span>
                        )}
                      </td>

                      {/* Doc Type */}
                      <td className="px-3 py-3.5">
                        <span className="badge badge-gray text-xs">
                          {docTypeLabel(doc.docType)}
                        </span>
                      </td>

                      {/* AI Summary */}
                      <td className="px-3 py-3.5 max-w-xs">
                        {doc.aiSummary ? (
                          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                            {doc.aiSummary}
                          </p>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)] italic flex items-center gap-1">
                            {doc.status === "PENDING" ? (
                              <>
                                <Clock className="size-3" />
                                Awaiting extraction
                              </>
                            ) : doc.status === "PROCESSING" ? (
                              <>
                                <Sparkles className="size-3 animate-pulse" />
                                Extracting…
                              </>
                            ) : (
                              "No summary"
                            )}
                          </span>
                        )}
                      </td>

                      {/* Facts Count */}
                      <td className="px-3 py-3.5 text-center">
                        {doc.extractedFacts.length > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-sm font-numeric font-semibold">
                              {doc.extractedFacts.length}
                            </span>
                            {flaggedFacts > 0 && (
                              <AlertTriangle className="size-3 text-[var(--color-status-amber)]" aria-label={`${flaggedFacts} flagged`} />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="px-3 py-3.5 text-right">
                        {doc.expiresAt ? (
                          <div>
                            <p className="text-xs font-numeric">
                              {formatDate(doc.expiresAt.toISOString(), "short")}
                            </p>
                            {daysToExpiry !== null && daysToExpiry <= 90 && (
                              <p
                                className={`text-xs font-semibold ${
                                  daysToExpiry <= 30
                                    ? "text-[var(--color-status-red)]"
                                    : "text-[var(--color-status-amber)]"
                                }`}
                              >
                                {daysToExpiry}d
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`badge ${
                            DOC_STATUS_CLASS[doc.status] ?? "badge-gray"
                          }`}
                        >
                          {doc.status}
                        </span>
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

function DocumentsLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 bg-[var(--color-slate-100)] rounded w-48 animate-pulse" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="data-card p-4">
            <div className="h-3 bg-[var(--color-slate-100)] rounded w-20 animate-pulse mb-2" />
            <div className="h-7 bg-[var(--color-slate-100)] rounded w-12 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="data-card p-8 text-center">
        <div className="h-4 bg-[var(--color-slate-100)] rounded w-40 mx-auto animate-pulse" />
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<DocumentsLoading />}>
      <DocumentsContent />
    </Suspense>
  );
}
