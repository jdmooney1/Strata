import type { Metadata } from "next";
import { Archive, Plus, Search } from "lucide-react";
import { MOCK_MEMORIES, MOCK_ASSETS } from "@/lib/mock-data";
import { formatDate, countryFlag, priorityBadgeClass } from "@/lib/utils";

export const metadata: Metadata = { title: "Institutional Memory" };

const MEMORY_TYPE_LABELS: Record<string, string> = {
  BOARD_DECISION:          "Board Decision",
  INVESTMENT_RATIONALE:    "Investment Rationale",
  COVENANT_DISCUSSION:     "Covenant Discussion",
  REFINANCING_DECISION:    "Refinancing Decision",
  OPERATIONAL_INCIDENT:    "Operational Incident",
  LENDER_DISCUSSION:       "Lender Discussion",
  ASSUMPTION_CHANGE:       "Assumption Change",
  RISK_ASSESSMENT:         "Risk Assessment",
  TENANT_DISCUSSION:       "Tenant Discussion",
  LEGAL_ADVICE:            "Legal Advice",
  TAX_POSITION:            "Tax Position",
  OTHER:                   "Other",
};

export default function MemoryPage() {
  const assetsMap = Object.fromEntries(MOCK_ASSETS.map((a) => [a.id, a]));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Institutional Memory</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            組織の記憶 — Decisions, discussions, and historical context
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--color-border)] rounded-md bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)] transition-colors">
            <Search className="size-3.5" />
            Search Memory
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white transition-colors" style={{ background: "var(--color-navy-700)" }}>
            <Plus className="size-3.5" />
            Add Memory
          </button>
        </div>
      </div>

      {/* What is Institutional Memory */}
      <div className="ai-insight">
        <p className="ai-insight-label">About Institutional Memory</p>
        <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
          Institutional Memory captures the decisions, discussions, and context that don&apos;t live in any document —
          board decisions, lender negotiations, tenant discussions, assumption changes. This knowledge layer
          eliminates key-person dependency and ensures new team members or advisers have access to the full
          decision history. Records can be searched semantically using AI.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Records", labelJa: "総記録数", value: MOCK_MEMORIES.length },
          { label: "Critical Priority", labelJa: "重要度：最高", value: MOCK_MEMORIES.filter((m) => m.importance === "CRITICAL").length },
          { label: "Board Decisions", labelJa: "取締役会決議", value: MOCK_MEMORIES.filter((m) => m.memoryType === "BOARD_DECISION").length },
          { label: "Lender Discussions", labelJa: "貸主協議", value: MOCK_MEMORIES.filter((m) => m.memoryType === "LENDER_DISCUSSION").length },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className="text-2xl font-semibold font-numeric mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Memory Cards */}
      <div className="space-y-4">
        <p className="section-label">Recent Records</p>
        {MOCK_MEMORIES.map((memory) => {
          const asset = memory.assetId ? assetsMap[memory.assetId] : null;

          return (
            <div key={memory.id} className="data-card">
              <div className="data-card-header">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{memory.title}</h3>
                      <span className={`badge ${priorityBadgeClass(memory.importance)}`}>
                        {memory.importance}
                      </span>
                      <span className="badge badge-navy">
                        {MEMORY_TYPE_LABELS[memory.memoryType] ?? memory.memoryType}
                      </span>
                    </div>
                    {memory.titleJa && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{memory.titleJa}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {asset && (
                    <div className="flex items-center gap-1.5 justify-end mb-1">
                      <span className="text-sm">{countryFlag(asset.country)}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{asset.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {formatDate(memory.period, "medium")}
                  </p>
                </div>
              </div>

              <div className="data-card-body space-y-3">
                {/* English content */}
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">English</p>
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                    {memory.content}
                  </p>
                </div>

                {/* Japanese content */}
                {memory.contentJa && (
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">日本語</p>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                      {memory.contentJa}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--color-border)]">
                    {memory.tags.map((tag) => (
                      <span key={tag} className="badge badge-gray">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Memory Form */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="flex items-center gap-2">
            <Archive className="size-4 text-[var(--color-navy-500)]" />
            <h2 className="text-sm font-semibold">Add New Memory Record</h2>
          </div>
        </div>
        <div className="data-card-body">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <label className="section-label block mb-1.5">Memory Type</label>
              <select className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]">
                {Object.entries(MEMORY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1.5">Related Asset</label>
              <select className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]">
                <option value="">Portfolio-wide</option>
                {MOCK_ASSETS.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1.5">Importance</label>
              <select className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)]">
                <option>CRITICAL</option>
                <option>HIGH</option>
                <option selected>MEDIUM</option>
                <option>LOW</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="section-label block mb-1.5">Content (English)</label>
            <textarea
              rows={4}
              placeholder="Record the decision, discussion, or context..."
              className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)] resize-none"
            />
          </div>
          <div className="mt-3">
            <label className="section-label block mb-1.5">Content (日本語) — optional</label>
            <textarea
              rows={4}
              placeholder="日本語での内容を記録..."
              className="w-full text-sm border border-[var(--color-border)] rounded-md px-3 py-2 bg-white focus:outline-none focus:border-[var(--color-navy-400)] resize-none"
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button className="px-4 py-2 text-xs font-semibold rounded-md text-white transition-colors" style={{ background: "var(--color-navy-700)" }}>
              Save Memory Record
            </button>
            <button className="px-4 py-2 text-xs font-medium rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
