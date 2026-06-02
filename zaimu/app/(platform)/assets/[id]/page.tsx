import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  AlertTriangle,
  FileText,
  FileBarChart,
  RefreshCw,
  Users,
  DollarSign,
  MapPin,
  Calendar,
  Sparkles,
  ShieldAlert,
  GitBranch,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  formatMillions,
  formatPercent,
  formatDate,
  covenantBadgeClass,
  assetTypeLabel,
  assetStatusBadgeClass,
  assetStatusLabel,
  scoreClass,
  countryFlag,
  countryName,
  priorityBadgeClass,
  taskStatusBadgeClass,
  docTypeLabel,
} from "@/lib/utils";
import { DocumentUploadSection } from "@/app/(platform)/documents/upload-section";
import { ExtractButton } from "@/app/(platform)/documents/extract-button";
import { RunEvaluationButton } from "@/app/(platform)/risk/run-evaluation-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await db.asset.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: asset?.name ?? "Asset" };
}

async function AssetDetailContent({ id }: { id: string }) {
  const [asset, healthScore, openRiskCount, assetWorkflows] = await Promise.all([
  db.asset.findUnique({
    where: { id },
    include: {
      ownershipEntities: true,
      loans: {
        include: { covenants: true },
        orderBy: { maturityDate: "asc" },
      },
      leases: { orderBy: { leaseEnd: "asc" } },
      capexItems: { where: { status: { notIn: ["COMPLETE", "CANCELLED"] } } },
      valuations: { orderBy: { valuationDate: "desc" }, take: 3 },
      documents: {
        include: { extractedFacts: { select: { id: true, flagged: true } } },
        orderBy: { uploadedAt: "desc" },
      },
      tasks: {
        where: { status: { notIn: ["COMPLETE", "CANCELLED"] } },
        orderBy: { dueDate: "asc" },
      },
      alerts: { where: { resolved: false }, orderBy: { triggeredAt: "desc" } },
      pmReports: { orderBy: { reportPeriod: "desc" }, take: 3 },
      reportAssets: {
        include: {
          report: {
            select: {
              id: true, title: true, reportType: true, status: true,
              period: true, generatedAt: true, language: true,
            },
          },
        },
        orderBy: { report: { createdAt: "desc" } },
        take: 5,
      },
    },
  }),
  db.assetHealthScore.findUnique({ where: { assetId: id } }),
  db.riskEvent.count({
    where: {
      assetId: id,
      status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] },
    },
  }),
  db.workflow.findMany({
    where: {
      assetId: id,
      status: { notIn: ["CANCELLED"] },
    },
    include: {
      steps: {
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  }),
  ]);

  if (!asset) notFound();

  const primaryLoan = asset.loans[0] ?? null;
  const monthsToRefi = asset.refinancingDate
    ? Math.ceil(
        (asset.refinancingDate.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24 * 30)
      )
    : null;

  const annualRent = asset.leases
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + Number(l.baseRent), 0);

  const totalDebt = asset.loans.reduce(
    (sum, l) => sum + Number(l.currentBalance),
    0
  );

  const allCovenants = asset.loans.flatMap((l) => l.covenants);

  // WAULT — Weighted Average Unexpired Lease Term (years, weighted by area)
  const activeLeases = asset.leases.filter((l) => l.status === "ACTIVE");
  const todayMs = Date.now();
  const wault = (() => {
    const leasesWithArea = activeLeases.filter((l) => l.area != null);
    const totalArea = leasesWithArea.reduce((s, l) => s + Number(l.area), 0);
    if (totalArea === 0 || leasesWithArea.length === 0) return null;
    const weightedYears = leasesWithArea.reduce((s, l) => {
      const yearsRemaining = Math.max(
        0,
        (l.leaseEnd.getTime() - todayMs) / (1000 * 60 * 60 * 24 * 365.25)
      );
      return s + yearsRemaining * Number(l.area);
    }, 0);
    return weightedYears / totalArea;
  })();

  const extractedDocs = asset.documents.filter(
    (d) => d.status === "EXTRACTED" || d.status === "REVIEWED"
  ).length;

  return (
    <div className="space-y-5">
      {/* Back nav */}
      <div>
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Assets
        </Link>
      </div>

      {/* Asset Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="size-8 flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: "var(--color-navy-100)", borderRadius: "2px" }}
          >
            {countryFlag(asset.country)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{asset.name}</h1>
              <span
                className={`badge ${assetStatusBadgeClass(asset.status)}`}
              >
                {assetStatusLabel(asset.status)}
              </span>
              <span className="badge badge-gray">
                {assetTypeLabel(asset.assetType)}
              </span>
            </div>
            {asset.nameJa && (
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                {asset.nameJa}
              </p>
            )}
            <div className="flex items-center gap-4 mt-1.5">
              <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                <MapPin className="size-3" />
                {asset.city}, {countryName(asset.country)}
              </span>
              {asset.address && (
                <span className="text-xs text-[var(--color-text-muted)] hidden sm:block">
                  {asset.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Health Score */}
        {asset.operationalScore != null && (
          <div className="text-right flex-shrink-0">
            <p className="section-label mb-0.5">Health Score</p>
            <p
              className={`text-3xl font-bold font-numeric ${scoreClass(
                asset.operationalScore
              )}`}
            >
              {asset.operationalScore}
            </p>
          </div>
        )}
      </div>

      {/* Asset Metrics */}
      <div className="data-card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-4 py-2.5 text-left section-label">Valuation</th>
              <th className="px-4 py-2.5 text-right section-label">Total Debt</th>
              <th className="px-4 py-2.5 text-right section-label">Occupancy</th>
              <th className="px-4 py-2.5 text-right section-label">WAULT</th>
              <th className="px-4 py-2.5 text-right section-label">Annual Rent</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3">
                <p className="text-sm font-semibold font-numeric">
                  {asset.currentValuation
                    ? `${asset.currency} ${formatMillions(Number(asset.currentValuation))}M`
                    : "—"}
                </p>
                {asset.lastValuationDate && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    as at {formatDate(asset.lastValuationDate.toISOString(), "short")}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <p className="text-sm font-semibold font-numeric">
                  {totalDebt > 0
                    ? `${asset.currency} ${formatMillions(totalDebt)}M`
                    : "Unlevered"}
                </p>
                {primaryLoan?.ltv != null && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    LTV {formatPercent(Number(primaryLoan.ltv) / 100)}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <p className="text-sm font-semibold font-numeric">
                  {asset.occupancyRate != null
                    ? formatPercent(Number(asset.occupancyRate) / 100)
                    : "—"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {asset.totalArea != null ? Number(asset.totalArea).toLocaleString() : "—"} {asset.areaUnit}
                </p>
              </td>
              <td className="px-4 py-3 text-right">
                <p
                  className={`text-sm font-semibold font-numeric ${
                    wault == null ? "" : wault <= 1 ? "text-[var(--color-status-red)]" : wault <= 3 ? "text-[var(--color-status-amber)]" : ""
                  }`}
                >
                  {wault != null ? `${wault.toFixed(1)}yr` : "—"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {activeLeases.length} active lease{activeLeases.length !== 1 ? "s" : ""}
                </p>
              </td>
              <td className="px-4 py-3 text-right">
                <p className="text-sm font-semibold font-numeric">
                  {annualRent > 0
                    ? `${asset.currency} ${formatMillions(annualRent)}M`
                    : "—"}
                </p>
                {monthsToRefi != null && monthsToRefi > 0 && (
                  <p
                    className={`text-xs mt-0.5 font-medium ${
                      monthsToRefi <= 6
                        ? "text-[var(--color-status-red)]"
                        : monthsToRefi <= 12
                        ? "text-[var(--color-status-amber)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    Refi in {monthsToRefi}mo
                  </p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Alerts */}
      {asset.alerts.length > 0 && (
        <div className="space-y-2">
          {asset.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-${alert.severity.toLowerCase()} flex items-start gap-3`}
            >
              <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{alert.title}</p>
                <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
              </div>
              <span className="badge badge-gray text-xs flex-shrink-0">
                {alert.alertType.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column — Debt & Covenants, Leases */}
        <div className="lg:col-span-2 space-y-5">
          {/* Debt & Covenants */}
          {asset.loans.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-[var(--color-navy-500)]" />
                  <h2 className="text-sm font-semibold">Debt & Covenants</h2>
                </div>
                <span className="badge badge-gray">
                  {asset.loans.length} facilit
                  {asset.loans.length === 1 ? "y" : "ies"}
                </span>
              </div>
              <div className="data-card-body space-y-4">
                {asset.loans.map((loan) => (
                  <div key={loan.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {loan.lenderName}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {loan.loanType} ·{" "}
                          {(Number(loan.interestRate) * 100).toFixed(2)}%{" "}
                          {loan.rateType}
                          {loan.benchmark ? ` + ${loan.benchmark}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold font-numeric">
                          {loan.currency}{" "}
                          {formatMillions(Number(loan.currentBalance))}M
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          matures{" "}
                          {formatDate(loan.maturityDate.toISOString(), "short")}
                        </p>
                      </div>
                    </div>

                    {loan.covenants.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-t border-[var(--color-border)]">
                          <thead>
                            <tr className="bg-[var(--color-slate-50)] border-b border-[var(--color-border)]">
                              <th className="px-4 py-2 text-left font-semibold text-[var(--color-text-muted)]">Covenant</th>
                              <th className="px-4 py-2 text-right font-semibold text-[var(--color-text-muted)]">Current</th>
                              <th className="px-4 py-2 text-right font-semibold text-[var(--color-text-muted)]">Threshold</th>
                              <th className="px-4 py-2 text-left font-semibold text-[var(--color-text-muted)]">Next Test</th>
                              <th className="px-4 py-2 text-center font-semibold text-[var(--color-text-muted)]">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loan.covenants.map((cov) => (
                              <tr key={cov.id} className="border-b border-[var(--color-border)] last:border-0">
                                <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">
                                  {cov.covenantType}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold font-numeric">
                                  {cov.currentValue ?? "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-[var(--color-text-muted)]">
                                  {cov.threshold}
                                </td>
                                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                                  {cov.nextTestDate
                                    ? formatDate(cov.nextTestDate.toISOString(), "short")
                                    : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`badge ${covenantBadgeClass(cov.status)}`}>
                                    {cov.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leases */}
          {asset.leases.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-[var(--color-navy-500)]" />
                  <h2 className="text-sm font-semibold">Lease Schedule</h2>
                </div>
                <span className="badge badge-gray">
                  {asset.leases.filter((l) => l.status === "ACTIVE").length}{" "}
                  active
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                        Tenant
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                        Area
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                        Annual Rent
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                        Expiry
                      </th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {asset.leases.map((lease) => {
                      const rentAnnual =
                        lease.rentFrequency === "MONTHLY"
                          ? Number(lease.baseRent) * 12
                          : Number(lease.baseRent);
                      const daysToExpiry = Math.ceil(
                        (lease.leaseEnd.getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      );
                      return (
                        <tr
                          key={lease.id}
                          className="table-row-hover border-b border-[var(--color-border)] last:border-0"
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold">
                              {lease.tenantName}
                            </p>
                            {lease.tenantNameJa && (
                              <p className="text-xs text-[var(--color-text-muted)]">
                                {lease.tenantNameJa}
                              </p>
                            )}
                            {lease.floor && (
                              <p className="text-xs text-[var(--color-text-muted)]">
                                {lease.floor}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-numeric">
                            {lease.area != null ? Number(lease.area).toLocaleString() : "—"} {lease.areaUnit}
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-numeric">
                            {lease.currency}{" "}
                            {rentAnnual > 0
                              ? formatMillions(rentAnnual) + "M"
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <p className="text-xs font-numeric">
                              {formatDate(
                                lease.leaseEnd.toISOString(),
                                "short"
                              )}
                            </p>
                            {daysToExpiry <= 365 && daysToExpiry > 0 && (
                              <p
                                className={`text-xs font-semibold ${
                                  daysToExpiry <= 90
                                    ? "text-[var(--color-status-red)]"
                                    : "text-[var(--color-status-amber)]"
                                }`}
                              >
                                {daysToExpiry}d
                              </p>
                            )}
                            {lease.breakDate && (
                              <p className="text-xs text-[var(--color-status-amber)]">
                                Break:{" "}
                                {formatDate(
                                  lease.breakDate.toISOString(),
                                  "short"
                                )}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`badge ${
                                lease.status === "ACTIVE"
                                  ? "badge-green"
                                  : lease.status === "EXPIRED"
                                  ? "badge-gray"
                                  : "badge-amber"
                              }`}
                            >
                              {lease.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Documents</h2>
              </div>
              <span className="badge badge-gray">
                {extractedDocs}/{asset.documents.length} extracted
              </span>
            </div>

            {asset.documents.length === 0 ? (
              <div className="data-card-body text-center py-6">
                <FileText className="size-6 text-[var(--color-text-muted)] mx-auto mb-2" />
                <p className="text-xs text-[var(--color-text-muted)]">
                  No documents yet — upload one below
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {asset.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="px-4 py-3 flex items-center gap-3 table-row-hover"
                  >
                    <FileText className="size-4 text-[var(--color-navy-400)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="badge badge-gray text-xs">
                          {docTypeLabel(doc.docType)}
                        </span>
                        {doc.extractedFacts.length > 0 && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {doc.extractedFacts.length} facts
                          </span>
                        )}
                        {doc.aiSummary && (
                          <Sparkles className="size-3 text-[var(--color-navy-400)]" />
                        )}
                      </div>
                    </div>
                    {(doc.status === "PENDING" || doc.status === "ERROR") ? (
                      <ExtractButton docId={doc.id} />
                    ) : (
                      <span
                        className={`badge flex-shrink-0 ${
                          doc.status === "EXTRACTED" || doc.status === "REVIEWED"
                            ? "badge-green"
                            : doc.status === "PROCESSING"
                            ? "badge-blue"
                            : "badge-gray"
                        }`}
                      >
                        {doc.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload embedded in asset page */}
            <div className="border-t border-[var(--color-border)] p-4">
              <DocumentUploadSection orgId="org_sanyo_001" assetId={id} />
            </div>
          </div>
        </div>

        {/* Board Reports for this asset */}
        {asset.reportAssets.length > 0 && (
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <FileBarChart className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Board Reports</h2>
              </div>
              <Link href="/reports" className="text-xs text-[var(--color-text-muted)] hover:underline">
                All reports →
              </Link>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {asset.reportAssets.map(({ report }) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="px-4 py-3 flex items-center gap-3 table-row-hover"
                >
                  <div
                    className={`size-2 rounded-full flex-shrink-0 ${
                      report.status === "PUBLISHED" || report.status === "APPROVED"
                        ? "bg-[var(--color-status-green)]"
                        : report.status === "REVIEW"
                        ? "bg-[var(--color-status-amber)]"
                        : "bg-[var(--color-slate-300)]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {formatDate(report.period.toISOString(), "medium")} ·{" "}
                      {report.language === "ja" ? "日本語" : "English"}
                    </p>
                  </div>
                  <span
                    className={`badge flex-shrink-0 ${
                      report.status === "PUBLISHED" ? "badge-green"
                      : report.status === "APPROVED" ? "badge-navy"
                      : report.status === "REVIEW"   ? "badge-amber"
                      : "badge-gray"
                    }`}
                  >
                    {report.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Operational Health */}
        <div className="data-card">
          <div className="data-card-header">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-[var(--color-navy-500)]" />
              <h2 className="text-sm font-semibold">Operational Health</h2>
            </div>
            <RunEvaluationButton orgId={asset.orgId} assetId={id} variant="asset" />
          </div>
          {healthScore ? (
            <div className="data-card-body space-y-4">
              {/* Overall score */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Overall Score</p>
                  <p
                    className={`text-3xl font-bold font-numeric ${
                      healthScore.overallScore >= 80
                        ? "text-green-600"
                        : healthScore.overallScore >= 60
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {Math.round(healthScore.overallScore)}
                    <span className="text-base font-normal text-[var(--color-text-muted)]"> / 100</span>
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Scored {formatDate(healthScore.scoredAt, "medium")}
                  </p>
                </div>
                {openRiskCount > 0 && (
                  <Link
                    href={`/risk?assetId=${id}`}
                    className="text-right"
                  >
                    <p
                      className={`text-2xl font-bold font-numeric ${
                        (healthScore.openCritical + healthScore.openEscalated) > 0
                          ? "text-red-600"
                          : healthScore.openWarnings > 0
                          ? "text-amber-600"
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {openRiskCount}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">open issues →</p>
                  </Link>
                )}
              </div>

              {/* Category scores */}
              <div className="border-t border-[var(--color-border)]">
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      { label: "Lease",      score: healthScore.leaseScore },
                      { label: "Debt",       score: healthScore.debtScore },
                      { label: "Reporting",  score: healthScore.reportingScore },
                      { label: "Compliance", score: healthScore.complianceScore },
                      { label: "Treasury",   score: healthScore.treasuryScore },
                    ].map(({ label, score }) => (
                      <tr key={label} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-4 py-2 text-[var(--color-text-secondary)]">{label}</td>
                        <td
                          className="px-4 py-2 text-right font-numeric font-semibold"
                          style={{
                            color: score >= 80
                              ? "var(--color-status-green)"
                              : score >= 60
                              ? "var(--color-status-amber)"
                              : "var(--color-status-red)",
                          }}
                        >
                          {Math.round(score)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="data-card-body text-center py-6">
              <ShieldAlert className="size-6 text-[var(--color-text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                No health score yet. Run a risk scan to generate one.
              </p>
              {openRiskCount > 0 && (
                <Link
                  href={`/risk?assetId=${id}`}
                  className="text-xs text-[var(--color-navy-600)] hover:underline"
                >
                  {openRiskCount} open issue{openRiskCount !== 1 ? "s" : ""} →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right column — Ownership, Tasks, Timeline */}
        <div className="space-y-5">
          {/* Ownership */}
          {asset.ownershipEntities.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-[var(--color-navy-500)]" />
                  <h2 className="text-sm font-semibold">Ownership Structure</h2>
                </div>
              </div>
              <div className="data-card-body space-y-3">
                {asset.ownershipEntities.map((entity) => (
                  <div key={entity.id} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold">{entity.entityName}</p>
                      {entity.entityNameJa && (
                        <p className="text-xs text-[var(--color-text-muted)]">{entity.entityNameJa}</p>
                      )}
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {entity.entityType} · {entity.jurisdiction}
                      </p>
                    </div>
                    <span className="text-sm font-semibold font-numeric flex-shrink-0">
                      {formatPercent(Number(entity.ownershipPct) / 100)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Dates */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Key Dates</h2>
              </div>
            </div>
            <div className="data-card-body space-y-2">
              {asset.acquisitionDate && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-muted)]">
                    Acquisition
                  </span>
                  <span className="font-numeric font-medium">
                    {formatDate(asset.acquisitionDate.toISOString(), "short")}
                  </span>
                </div>
              )}
              {asset.lastValuationDate && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-muted)]">
                    Last Valuation
                  </span>
                  <span className="font-numeric font-medium">
                    {formatDate(asset.lastValuationDate.toISOString(), "short")}
                  </span>
                </div>
              )}
              {asset.refinancingDate && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--color-text-muted)]">
                    Refinancing Due
                  </span>
                  <span
                    className={`font-numeric font-medium ${
                      monthsToRefi != null && monthsToRefi <= 12
                        ? "text-[var(--color-status-amber)]"
                        : ""
                    }`}
                  >
                    {formatDate(asset.refinancingDate.toISOString(), "short")}
                    {monthsToRefi != null && monthsToRefi > 0 && (
                      <span className="ml-1 text-[var(--color-text-muted)]">
                        ({monthsToRefi}mo)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Open Tasks */}
          {asset.tasks.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <RefreshCw className="size-4 text-[var(--color-navy-500)]" />
                  <h2 className="text-sm font-semibold">Open Tasks</h2>
                </div>
                <span className="badge badge-gray">{asset.tasks.length}</span>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {asset.tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={`badge flex-shrink-0 mt-0.5 ${priorityBadgeClass(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight">
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Due{" "}
                            {formatDate(task.dueDate.toISOString(), "short")}
                          </p>
                        )}
                      </div>
                      <span
                        className={`badge flex-shrink-0 ${taskStatusBadgeClass(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valuations */}
          {asset.valuations.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-[var(--color-navy-500)]" />
                  <h2 className="text-sm font-semibold">Valuations</h2>
                </div>
              </div>
              <div className="data-card-body space-y-2">
                {asset.valuations.map((val) => (
                  <div
                    key={val.id}
                    className="flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-medium">
                        {formatDate(val.valuationDate.toISOString(), "short")}
                      </p>
                      <p className="text-[var(--color-text-muted)]">
                        {val.valuer ?? "Independent"}
                      </p>
                    </div>
                    <p className="font-semibold font-numeric">
                      {val.currency}{" "}
                      {formatMillions(Number(val.value))}M
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Workflows */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-[var(--color-navy-500)]" />
            <h2 className="text-sm font-semibold">Operational Workflows</h2>
          </div>
          <Link
            href={`/workflows/new?assetId=${asset.id}`}
            className="text-xs text-[var(--color-text-link)] hover:underline"
          >
            + New workflow
          </Link>
        </div>
        {assetWorkflows.length === 0 ? (
          <div className="px-4 py-4 text-xs text-[var(--color-text-muted)]">
            No workflows for this asset.{" "}
            <Link href="/workflows/new" className="text-[var(--color-text-link)] hover:underline">
              Create one →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {assetWorkflows.map((wf) => {
              const total = wf.steps.length;
              const done = wf.steps.filter(
                (s) => s.status === "COMPLETE" || s.status === "SKIPPED"
              ).length;
              return (
                <Link
                  key={wf.id}
                  href={`/workflows/${wf.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--color-slate-50)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {wf.title}
                    </p>
                    {total > 0 && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {done}/{total} steps
                      </p>
                    )}
                  </div>
                  <span
                    className={`badge flex-shrink-0 ${
                      wf.status === "ACTIVE"
                        ? "badge-navy"
                        : wf.status === "BLOCKED"
                        ? "badge-red"
                        : wf.status === "COMPLETED"
                        ? "badge-green"
                        : "badge-gray"
                    }`}
                  >
                    {wf.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetDetailLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 bg-[var(--color-slate-100)] rounded w-20" />
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-lg bg-[var(--color-slate-100)]" />
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-[var(--color-slate-100)] rounded w-64" />
          <div className="h-4 bg-[var(--color-slate-100)] rounded w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="data-card p-4">
            <div className="h-3 bg-[var(--color-slate-100)] rounded w-20 mb-2" />
            <div className="h-7 bg-[var(--color-slate-100)] rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<AssetDetailLoading />}>
      <AssetDetailContent id={id} />
    </Suspense>
  );
}
