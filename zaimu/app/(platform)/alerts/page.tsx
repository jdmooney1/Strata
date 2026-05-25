import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, countryFlag } from "@/lib/utils";
import { ResolveButton } from "./resolve-button";

export const metadata: Metadata = { title: "Alerts" };
export const dynamic = "force-dynamic";

const ALERT_TYPE_LABELS: Record<string, string> = {
  COVENANT_BREACH:  "Covenant Breach",
  COVENANT_WATCH:   "Covenant Watch",
  LOAN_MATURITY:    "Loan Maturity",
  LEASE_EXPIRY:     "Lease Expiry",
  LEASE_BREAK:      "Lease Break",
  RENEWAL_WINDOW:   "Renewal Window",
  REPORT_OVERDUE:   "Report Overdue",
  CAPEX_OVERRUN:    "CAPEX Overrun",
  FX_THRESHOLD:     "FX Threshold",
  OCCUPANCY_DROP:   "Occupancy Drop",
  DOCUMENT_EXPIRY:  "Document Expiry",
  OBLIGATION_DUE:   "Obligation Due",
};

const SEVERITY_CONFIG: Record<string, { cls: string; label: string }> = {
  CRITICAL: { cls: "badge-red",   label: "Critical" },
  HIGH:     { cls: "badge-amber", label: "High" },
  MEDIUM:   { cls: "badge-blue",  label: "Medium" },
  LOW:      { cls: "badge-gray",  label: "Low" },
  INFO:     { cls: "badge-gray",  label: "Info" },
};

async function AlertsContent() {
  const alerts = await db.alert.findMany({
    orderBy: [{ resolved: "asc" }, { triggeredAt: "desc" }],
    include: {
      asset: { select: { id: true, name: true, country: true } },
    },
  });

  const active   = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);
  const critical = active.filter((a) => a.severity === "CRITICAL");
  const high     = active.filter((a) => a.severity === "HIGH");
  const medium   = active.filter((a) => a.severity === "MEDIUM");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">Operational Alerts</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            オペレーショナルアラート — {active.length} active · {resolved.length} resolved
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {critical.length > 0 && (
            <span className="badge badge-red">{critical.length} Critical</span>
          )}
          {high.length > 0 && (
            <span className="badge badge-amber">{high.length} High</span>
          )}
          {medium.length > 0 && (
            <span className="badge badge-blue">{medium.length} Medium</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Critical",     labelJa: "緊急",          value: critical.length, color: critical.length > 0 ? "text-[var(--color-status-red)]" : "" },
          { label: "High",         labelJa: "高",            value: high.length,     color: high.length > 0 ? "text-[var(--color-status-amber)]" : "" },
          { label: "Medium",       labelJa: "中",            value: medium.length,   color: "" },
          { label: "Total Active", labelJa: "アクティブ合計", value: active.length,   color: "" },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className={`text-2xl font-semibold font-numeric mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Active alerts */}
      <div>
        <p className="section-label mb-3">Active Alerts</p>
        <div className="space-y-3">
          {active.length === 0 ? (
            <div className="data-card p-8 text-center">
              <CheckCircle className="size-8 text-[var(--color-status-green)] mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">No active alerts</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">All operational items are clear</p>
            </div>
          ) : (
            active.map((alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.INFO;

              return (
                <div
                  key={alert.id}
                  className={`rounded-lg border overflow-hidden ${
                    alert.severity === "CRITICAL"
                      ? "border-[var(--color-status-red)] bg-[var(--color-status-red-bg)]"
                      : alert.severity === "HIGH"
                      ? "border-[var(--color-status-amber)] bg-[var(--color-status-amber-bg)]"
                      : "border-[var(--color-border)] bg-white"
                  }`}
                >
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <AlertTriangle
                        className={`size-4 ${
                          alert.severity === "CRITICAL"
                            ? "text-[var(--color-status-red)]"
                            : alert.severity === "HIGH"
                            ? "text-[var(--color-status-amber)]"
                            : "text-[var(--color-status-blue)]"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold leading-tight">{alert.title}</p>
                            <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                            <span className="badge badge-gray">
                              {ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}
                            </span>
                          </div>
                          {alert.asset && (
                            <Link
                              href={`/assets/${alert.asset.id}`}
                              className="flex items-center gap-1 mt-1 text-xs text-[var(--color-text-muted)] hover:underline"
                            >
                              <span>{countryFlag(alert.asset.country)}</span>
                              <span>{alert.asset.name}</span>
                            </Link>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] whitespace-nowrap flex-shrink-0">
                          {formatDate(alert.triggeredAt.toISOString(), "medium")}
                        </p>
                      </div>
                      <p className="text-sm mt-1.5 leading-relaxed text-[var(--color-text-primary)]">
                        {alert.message}
                      </p>
                      {alert.messageJa && (
                        <p className="text-xs mt-1.5 text-[var(--color-text-secondary)] leading-relaxed border-t border-black/10 pt-1.5">
                          {alert.messageJa}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 pt-0.5">
                      <ResolveButton alertId={alert.id} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <p className="section-label mb-3">Resolved Alerts</p>
          <div className="data-card divide-y divide-[var(--color-border)]">
            {resolved.map((alert) => (
              <div key={alert.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
                <CheckCircle className="size-4 text-[var(--color-status-green)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  {alert.resolvedAt && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Resolved {formatDate(alert.resolvedAt.toISOString(), "medium")}
                    </p>
                  )}
                </div>
                <span className="badge badge-gray">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="data-card p-10 text-center">
          <Bell className="size-8 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">No alerts configured</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Alerts are generated automatically from asset data — covenants, lease expiries, loan maturities
          </p>
        </div>
      )}
    </div>
  );
}

function AlertsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-[var(--color-slate-100)] rounded w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="data-card p-4">
            <div className="h-3 bg-[var(--color-slate-100)] rounded w-16 mb-2" />
            <div className="h-7 bg-[var(--color-slate-100)] rounded w-8" />
          </div>
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-[var(--color-border)] bg-white p-4">
          <div className="h-4 bg-[var(--color-slate-100)] rounded w-64 mb-2" />
          <div className="h-3 bg-[var(--color-slate-100)] rounded w-full" />
        </div>
      ))}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<AlertsLoading />}>
      <AlertsContent />
    </Suspense>
  );
}
