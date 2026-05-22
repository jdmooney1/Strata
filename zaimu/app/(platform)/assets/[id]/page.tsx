import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  AlertTriangle,
  FileText,
  RefreshCw,
  Users,
  DollarSign,
  MapPin,
  Calendar,
} from "lucide-react";
import {
  MOCK_ASSETS,
  MOCK_LOANS,
  MOCK_LEASES,
  MOCK_COVENANTS,
  MOCK_DOCUMENTS,
  MOCK_ALERTS,
  MOCK_TASKS,
} from "@/lib/mock-data";
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
  priorityBadgeClass,
  taskStatusBadgeClass,
  docTypeLabel,
} from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = MOCK_ASSETS.find((a) => a.id === id);
  return { title: asset?.name ?? "Asset" };
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const asset = MOCK_ASSETS.find((a) => a.id === id);
  if (!asset) notFound();

  const loans = MOCK_LOANS.filter((l) => l.assetId === asset.id);
  const leases = MOCK_LEASES.filter((l) => l.assetId === asset.id);
  const covenants = MOCK_COVENANTS.filter((c) =>
    loans.some((l) => l.id === c.loanId)
  );
  const documents = MOCK_DOCUMENTS.filter((d) => d.assetId === asset.id);
  const alerts = MOCK_ALERTS.filter(
    (a) => a.assetId === asset.id && !a.resolved
  );
  const tasks = MOCK_TASKS.filter(
    (t) => t.assetId === asset.id && t.status !== "COMPLETE"
  );

  const primaryLoan = loans[0];
  const monthsToRefi = asset.refinancingDate
    ? Math.ceil(
        (new Date(asset.refinancingDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24 * 30)
      )
    : null;

  const annualRent = leases
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => {
      const annual =
        l.rentFrequency === "MONTHLY_PSF"
          ? l.baseRent * l.area! * 12
          : l.rentFrequency === "ANNUAL_PSF"
          ? l.baseRent * l.area!
          : l.rentFrequency === "ANNUAL_PSM"
          ? l.baseRent * l.area!
          : l.baseRent * 12;
      return sum + annual;
    }, 0);

  return (
    <div className="space-y-5">
      {/* Back nav + header */}
      <div>
        <Link
          href="/assets"
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-3 transition-colors"
        >
          <ArrowLeft className="size-3" />
          Back to Assets
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{countryFlag(asset.country)}</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{asset.name}</h1>
                <span
                  className={`badge ${assetStatusBadgeClass(asset.status)}`}
                >
                  {assetStatusLabel(asset.status)}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                {asset.nameJa}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-1">
                <MapPin className="size-3" />
                {asset.address ?? `${asset.city}, ${countryName(asset.country)}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-status-red)] bg-[var(--color-status-red-bg)] px-3 py-1.5 rounded-md">
                <AlertTriangle className="size-3.5" />
                {alerts.length} Active Alert{alerts.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-md px-4 py-3 flex items-start gap-3 ${
            alert.severity === "CRITICAL"
              ? "alert-critical"
              : "alert-high"
          }`}
        >
          <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">{alert.title}</p>
            <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
          </div>
        </div>
      ))}

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          label="Current Valuation"
          labelJa="現在評価額"
          value={formatMillions(asset.currentValuation ?? 0, asset.currency)}
          sub={`As of ${formatDate(asset.lastValuationDate, "short")}`}
        />
        <KpiCard
          label="Annual Passing Rent"
          labelJa="年間賃料収入"
          value={formatMillions(annualRent, asset.currency)}
          sub={`${leases.filter((l) => l.status === "ACTIVE").length} active leases`}
        />
        <KpiCard
          label="Occupancy"
          labelJa="稼働率"
          value={formatPercent(asset.occupancyRate ?? 0)}
          sub={`${asset.totalArea?.toLocaleString()} ${asset.areaUnit}`}
          highlight={
            (asset.occupancyRate ?? 0) < 80 ? "warning" : "normal"
          }
        />
        <KpiCard
          label="Senior Debt"
          labelJa="シニアローン"
          value={
            primaryLoan
              ? formatMillions(primaryLoan.currentBalance, primaryLoan.currency)
              : "—"
          }
          sub={primaryLoan ? `LTV ${formatPercent(primaryLoan.ltv ?? 0)}` : ""}
        />
        <KpiCard
          label="Covenant Status"
          labelJa="コベナンツ状況"
          value={covenantLabel(asset.covenantStatus)}
          sub={`${covenants.filter((c) => c.status === "BREACH").length} breach · ${covenants.filter((c) => c.status === "WATCH").length} watch`}
          highlight={
            asset.covenantStatus === "BREACH"
              ? "danger"
              : asset.covenantStatus === "WATCH"
              ? "warning"
              : "normal"
          }
        />
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Debt Stack + Covenants */}
        <div className="lg:col-span-2 space-y-5">
          {/* Debt Stack */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Debt Stack</h2>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                負債構成
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                    <th className="text-left px-4 py-2.5">Lender</th>
                    <th className="text-left px-3 py-2.5">Type</th>
                    <th className="text-right px-3 py-2.5">Balance</th>
                    <th className="text-right px-3 py-2.5">Rate</th>
                    <th className="text-right px-3 py-2.5">LTV</th>
                    <th className="text-right px-3 py-2.5">DSCR</th>
                    <th className="text-right px-3 py-2.5">Maturity</th>
                    <th className="text-center px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr
                      key={loan.id}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{loan.lenderName}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {loan.currency}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="badge badge-navy text-xs">
                          {loan.loanType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-numeric">
                        <p className="text-sm font-semibold">
                          {formatMillions(loan.currentBalance, loan.currency)}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          orig.{" "}
                          {formatMillions(
                            loan.originalBalance,
                            loan.currency
                          )}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-numeric text-sm">
                        {formatPercent(loan.interestRate * 100, 2)}
                        {loan.rateType !== "FIXED" && (
                          <span className="text-xs text-[var(--color-text-muted)] block">
                            {loan.benchmark} +{" "}
                            {formatPercent((loan.margin ?? 0) * 100, 2)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-numeric">
                        <span
                          className={`text-sm font-medium ${
                            (loan.ltv ?? 0) <= 55
                              ? "text-[var(--color-status-green)]"
                              : (loan.ltv ?? 0) <= 65
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {loan.ltv ? formatPercent(loan.ltv) : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-numeric">
                        <span
                          className={`text-sm font-medium ${
                            (loan.dscr ?? 0) >= 1.5
                              ? "text-[var(--color-status-green)]"
                              : (loan.dscr ?? 0) >= 1.2
                              ? "text-[var(--color-status-amber)]"
                              : "text-[var(--color-status-red)]"
                          }`}
                        >
                          {loan.dscr?.toFixed(2) ?? "—"}x
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-numeric">
                        <p className="text-sm">
                          {formatDate(loan.maturityDate, "short")}
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
                      </td>
                      <td className="px-3 py-3 text-center">
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Covenant Table */}
          {covenants.length > 0 && (
            <div className="data-card">
              <div className="data-card-header">
                <h2 className="text-sm font-semibold">Loan Covenants</h2>
                <span className="text-xs text-[var(--color-text-muted)]">
                  コベナンツ
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                      <th className="text-left px-4 py-2.5">Covenant</th>
                      <th className="text-right px-3 py-2.5">Threshold</th>
                      <th className="text-right px-3 py-2.5">Current</th>
                      <th className="text-left px-3 py-2.5">Frequency</th>
                      <th className="text-right px-3 py-2.5">Next Test</th>
                      <th className="text-center px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {covenants.map((cov, i) => (
                      <tr
                        key={i}
                        className={`border-b border-[var(--color-border)] last:border-0 ${
                          cov.status === "BREACH"
                            ? "bg-[var(--color-status-red-bg)]"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">
                            {cov.description}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {cov.covenantType}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right font-numeric text-sm">
                          {cov.threshold}
                        </td>
                        <td className="px-3 py-3 text-right font-numeric">
                          <span
                            className={`text-sm font-semibold ${
                              cov.status === "COMPLIANT"
                                ? "text-[var(--color-status-green)]"
                                : cov.status === "WATCH"
                                ? "text-[var(--color-status-amber)]"
                                : "text-[var(--color-status-red)]"
                            }`}
                          >
                            {cov.currentValue ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--color-text-secondary)]">
                          {cov.testFreq}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-numeric text-[var(--color-text-secondary)]">
                          {formatDate(cov.nextTestDate, "short")}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`badge ${covenantBadgeClass(
                              cov.status
                            )}`}
                          >
                            {covenantLabel(cov.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lease Schedule */}
          <div className="data-card">
            <div className="data-card-header">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-[var(--color-navy-500)]" />
                <h2 className="text-sm font-semibold">Lease Schedule</h2>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                リーススケジュール
              </span>
            </div>
            {leases.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-slate-50)]">
                      <th className="text-left px-4 py-2.5">Tenant</th>
                      <th className="text-left px-3 py-2.5">Floor / Area</th>
                      <th className="text-right px-3 py-2.5">Rent</th>
                      <th className="text-right px-3 py-2.5">Expiry</th>
                      <th className="text-right px-3 py-2.5">Break</th>
                      <th className="text-center px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leases.map((lease) => {
                      const monthsToExpiry = Math.ceil(
                        (new Date(lease.leaseEnd).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24 * 30)
                      );
                      return (
                        <tr
                          key={lease.id}
                          className={`border-b border-[var(--color-border)] last:border-0 ${
                            lease.status === "NOTICE_GIVEN"
                              ? "bg-[var(--color-status-red-bg)]"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">
                              {lease.tenantName}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-xs text-[var(--color-text-secondary)]">
                            <p>{lease.floor}</p>
                            {lease.area && (
                              <p className="font-numeric">
                                {lease.area.toLocaleString()} {lease.areaUnit}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-numeric text-sm">
                            {lease.currency}{" "}
                            {lease.baseRent.toLocaleString()} / {lease.areaUnit}{" "}
                            p.a.
                          </td>
                          <td className="px-3 py-3 text-right">
                            <p className="text-sm font-numeric">
                              {formatDate(lease.leaseEnd, "short")}
                            </p>
                            <p
                              className={`text-xs ${
                                monthsToExpiry <= 12
                                  ? "text-[var(--color-status-red)]"
                                  : monthsToExpiry <= 18
                                  ? "text-[var(--color-status-amber)]"
                                  : "text-[var(--color-text-muted)]"
                              }`}
                            >
                              {monthsToExpiry}mo
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-numeric text-[var(--color-text-secondary)]">
                            {lease.breakDate
                              ? formatDate(lease.breakDate, "short")
                              : "—"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`badge ${
                                lease.status === "ACTIVE"
                                  ? "badge-green"
                                  : lease.status === "NOTICE_GIVEN"
                                  ? "badge-red"
                                  : lease.status === "RENEWED"
                                  ? "badge-blue"
                                  : "badge-gray"
                              }`}
                            >
                              {lease.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="data-card-body text-sm text-[var(--color-text-muted)]">
                No leases on record.
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Health Scores */}
          <div className="data-card p-4">
            <h3 className="text-xs font-semibold mb-3">Asset Health</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Operational Score
                  </span>
                  <span className="text-xs font-semibold font-numeric">
                    {asset.operationalScore ?? "—"}/100
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${asset.operationalScore ?? 0}%`,
                      backgroundColor:
                        (asset.operationalScore ?? 0) >= 75
                          ? "var(--color-status-green)"
                          : (asset.operationalScore ?? 0) >= 50
                          ? "var(--color-status-amber)"
                          : "var(--color-status-red)",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Reporting Score
                  </span>
                  <span className="text-xs font-semibold font-numeric">
                    {asset.reportingScore ?? "—"}/100
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${asset.reportingScore ?? 0}%`,
                      backgroundColor:
                        (asset.reportingScore ?? 0) >= 75
                          ? "var(--color-status-green)"
                          : (asset.reportingScore ?? 0) >= 50
                          ? "var(--color-status-amber)"
                          : "var(--color-status-red)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Asset Details */}
          <div className="data-card p-4">
            <h3 className="text-xs font-semibold mb-3">Asset Details</h3>
            <div className="space-y-2">
              {[
                { label: "Type", value: assetTypeLabel(asset.assetType) },
                { label: "Country", value: countryName(asset.country) },
                { label: "City", value: asset.city },
                {
                  label: "Total Area",
                  value: `${asset.totalArea?.toLocaleString()} ${asset.areaUnit}`,
                },
                {
                  label: "Acquired",
                  value: formatDate(asset.acquisitionDate, "medium"),
                },
                {
                  label: "Acq. Cost",
                  value: asset.acquisitionCost
                    ? formatMillions(asset.acquisitionCost, asset.currency)
                    : "—",
                },
                {
                  label: "Last Valued",
                  value: formatDate(asset.lastValuationDate, "medium"),
                },
                {
                  label: "Currency",
                  value: asset.currency,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between gap-2 py-1 border-b border-[var(--color-border)] last:border-0"
                >
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {item.label}
                  </span>
                  <span className="text-xs font-medium text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Open Tasks */}
          {tasks.length > 0 && (
            <div className="data-card">
              <div className="data-card-header py-3">
                <h3 className="text-xs font-semibold">Open Tasks</h3>
                <span className="badge badge-gray">{tasks.length}</span>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {tasks.map((task) => (
                  <div key={task.id} className="px-4 py-2.5">
                    <div className="flex items-start gap-2">
                      <span
                        className={`badge ${priorityBadgeClass(task.priority)} mt-0.5 flex-shrink-0`}
                      >
                        {task.priority.charAt(0)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight line-clamp-2">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {formatDate(task.dueDate, "short")}
                          </span>
                          <span
                            className={`badge ${taskStatusBadgeClass(
                              task.status
                            )}`}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="data-card">
              <div className="data-card-header py-3">
                <h3 className="text-xs font-semibold">Key Documents</h3>
                <Link
                  href="/documents"
                  className="text-xs text-[var(--color-text-link)] hover:underline"
                >
                  All docs
                </Link>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {documents.map((doc) => (
                  <div key={doc.id} className="px-4 py-2.5">
                    <div className="flex items-start gap-2">
                      <FileText className="size-3.5 mt-0.5 text-[var(--color-navy-400)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="badge badge-gray">
                            {docTypeLabel(doc.docType)}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {formatDate(doc.uploadedAt, "short")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Intelligence */}
      {documents.some((d) => d.aiSummary) && (
        <div className="ai-insight">
          <p className="ai-insight-label">AI Document Intelligence</p>
          <div className="space-y-3">
            {documents
              .filter((d) => d.aiSummary)
              .map((doc) => (
                <div key={doc.id}>
                  <p className="text-xs font-semibold text-[var(--color-navy-700)] mb-1">
                    {doc.name}
                  </p>
                  <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
                    {doc.aiSummary}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  labelJa,
  value,
  sub,
  highlight = "normal",
}: {
  label: string;
  labelJa: string;
  value: string;
  sub?: string;
  highlight?: "normal" | "warning" | "danger";
}) {
  return (
    <div
      className={`data-card p-4 ${
        highlight === "danger"
          ? "border-[var(--color-status-red)] bg-[var(--color-status-red-bg)]"
          : highlight === "warning"
          ? "border-[var(--color-status-amber)] bg-[var(--color-status-amber-bg)]"
          : ""
      }`}
    >
      <p className="section-label">{label}</p>
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{labelJa}</p>
      <p
        className={`text-xl font-semibold font-numeric ${
          highlight === "danger"
            ? "text-[var(--color-status-red)]"
            : highlight === "warning"
            ? "text-[var(--color-status-amber)]"
            : ""
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>
      )}
    </div>
  );
}
