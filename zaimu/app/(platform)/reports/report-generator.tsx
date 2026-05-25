"use client";
import { useState } from "react";
import { Sparkles, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Plus } from "lucide-react";

const ASSETS = [{ id: "asset_collins_001", name: "Collins Square Tower 5" }];
const REPORT_TYPES = [
  { value: "MONTHLY_BOARD", label: "Monthly Board Report" },
  { value: "QUARTERLY_REVIEW", label: "Quarterly Review" },
  { value: "RISK_SUMMARY", label: "Risk Summary" },
  { value: "COVENANT_REPORT", label: "Covenant Report" },
  { value: "FX_EXPOSURE", label: "FX Exposure Report" },
];

type GenState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; title: string; overallStatus: string }
  | { status: "error"; message: string };

export function ReportGenerator({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState(ASSETS[0].id);
  const [reportType, setReportType] = useState("MONTHLY_BOARD");
  const [language, setLanguage] = useState("ja");
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [state, setState] = useState<GenState>({ status: "idle" });

  async function handleGenerate() {
    setState({ status: "generating" });
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          assetId,
          reportType,
          language,
          period: new Date(period + "-01").toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const data = await res.json() as { content: { title?: string; overallStatus?: string } };
      setState({
        status: "done",
        title: (data.content?.title as string) || "Report generated",
        overallStatus: (data.content?.overallStatus as string) || "GREEN",
      });
      // Reload to show the new report in the list
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return (
    <div className="data-card">
      <button className="data-card-header w-full text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <Plus className="size-4 text-[var(--color-navy-500)]" />
          <h2 className="text-sm font-semibold">Generate New Report</h2>
          <p className="text-xs text-[var(--color-text-muted)] ml-1">新規レポート生成</p>
        </div>
        {open ? <ChevronUp className="size-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="size-4 text-[var(--color-text-muted)]" />}
      </button>

      {open && (
        <div className="data-card-body border-t border-[var(--color-border)] space-y-4">
          {state.status === "done" && (
            <div className="border border-[var(--color-status-green)] bg-[var(--color-status-green-bg)] rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="size-5 text-[var(--color-status-green)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-status-green)]">Report generated</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{state.title}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Overall status: {state.overallStatus} — reloading list…</p>
              </div>
            </div>
          )}
          {state.status === "error" && (
            <div className="border border-[var(--color-status-red)] bg-[var(--color-status-red-bg)] rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="size-5 text-[var(--color-status-red)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[var(--color-status-red)]">Generation failed</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{state.message}</p>
              </div>
              <button onClick={() => setState({ status: "idle" })} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Retry</button>
            </div>
          )}

          {state.status !== "done" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="section-label block mb-1.5">Asset</label>
                <select value={assetId} onChange={e => setAssetId(e.target.value)} className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]">
                  {ASSETS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label block mb-1.5">Report Type</label>
                <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]">
                  {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label block mb-1.5">Period</label>
                <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]" />
              </div>
              <div>
                <label className="section-label block mb-1.5">Language</label>
                <div className="flex gap-2">
                  {[{ v: "ja", l: "日本語" }, { v: "en", l: "English" }].map(({ v, l }) => (
                    <button key={v} onClick={() => setLanguage(v)}
                      className={`flex-1 text-xs font-medium py-2 rounded-md border transition-colors ${language === v ? "border-[var(--color-navy-700)] bg-[var(--color-navy-700)] text-white" : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)]"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {state.status !== "done" && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={state.status === "generating"}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ background: "var(--color-navy-700)" }}
              >
                {state.status === "generating" ? (
                  <><Loader2 className="size-3.5 animate-spin" />Generating…</>
                ) : (
                  <><Sparkles className="size-3.5" />Generate with AI</>
                )}
              </button>
              {state.status === "generating" && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Claude is reading asset data and drafting the report — 30–60 seconds
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
