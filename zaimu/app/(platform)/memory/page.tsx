import type { Metadata } from "next";
import { Suspense } from "react";
import { Archive } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, countryFlag, priorityBadgeClass } from "@/lib/utils";
import { AddMemoryForm } from "./add-memory-form";

export const metadata: Metadata = { title: "Institutional Memory" };
export const dynamic = "force-dynamic";

const MEMORY_TYPE_LABELS: Record<string, string> = {
  BOARD_DECISION:       "Board Decision",
  INVESTMENT_RATIONALE: "Investment Rationale",
  COVENANT_DISCUSSION:  "Covenant Discussion",
  REFINANCING_DECISION: "Refinancing Decision",
  OPERATIONAL_INCIDENT: "Operational Incident",
  LENDER_DISCUSSION:    "Lender Discussion",
  ASSUMPTION_CHANGE:    "Assumption Change",
  RISK_ASSESSMENT:      "Risk Assessment",
  TENANT_DISCUSSION:    "Tenant Discussion",
  LEGAL_ADVICE:         "Legal Advice",
  TAX_POSITION:         "Tax Position",
  OTHER:                "Other",
};

async function MemoryContent() {
  const [memories, assets] = await Promise.all([
    db.institutionalMemory.findMany({
      where: { orgId: "org_sanyo_001" },
      include: {
        asset: { select: { id: true, name: true, country: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.asset.findMany({
      where: { orgId: "org_sanyo_001" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalRecords    = memories.length;
  const criticalCount   = memories.filter((m) => m.importance === "CRITICAL").length;
  const boardDecisions  = memories.filter((m) => m.memoryType === "BOARD_DECISION").length;
  const lenderDiscussions = memories.filter((m) => m.memoryType === "LENDER_DISCUSSION").length;

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
      </div>

      {/* About panel */}
      <div className="ai-insight">
        <p className="ai-insight-label">About Institutional Memory</p>
        <p className="text-sm text-[var(--color-navy-900)] leading-relaxed">
          Institutional Memory captures the decisions, discussions, and context that don&apos;t live in any
          document — board decisions, lender negotiations, tenant discussions, assumption changes. This
          knowledge layer eliminates key-person dependency and ensures new team members or advisers have
          access to the full decision history.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Records",      labelJa: "総記録数",    value: totalRecords },
          { label: "Critical Priority",  labelJa: "重要度：最高", value: criticalCount },
          { label: "Board Decisions",    labelJa: "取締役会決議", value: boardDecisions },
          { label: "Lender Discussions", labelJa: "貸主協議",    value: lenderDiscussions },
        ].map((s) => (
          <div key={s.label} className="data-card p-4">
            <p className="section-label">{s.label}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.labelJa}</p>
            <p className="text-2xl font-semibold font-numeric mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Memory cards */}
      {memories.length > 0 && (
        <div className="space-y-4">
          <p className="section-label">Recent Records</p>
          {memories.map((memory) => (
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
                  {memory.asset && (
                    <div className="flex items-center gap-1.5 justify-end mb-1">
                      <span className="text-sm">{countryFlag(memory.asset.country)}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{memory.asset.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {formatDate(
                      (memory.period ?? memory.createdAt).toISOString(),
                      "medium"
                    )}
                  </p>
                </div>
              </div>

              <div className="data-card-body space-y-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">English</p>
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                    {memory.content}
                  </p>
                </div>
                {memory.contentJa && (
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">日本語</p>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                      {memory.contentJa}
                    </p>
                  </div>
                )}
                {memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--color-border)]">
                    {memory.tags.map((tag) => (
                      <span key={tag} className="badge badge-gray">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new memory form */}
      <div className="data-card">
        <div className="data-card-header">
          <div className="flex items-center gap-2">
            <Archive className="size-4 text-[var(--color-navy-500)]" />
            <h2 className="text-sm font-semibold">Add New Memory Record</h2>
            <p className="text-xs text-[var(--color-text-muted)] ml-1">新規記録の追加</p>
          </div>
        </div>
        <div className="data-card-body">
          <AddMemoryForm orgId="org_sanyo_001" assets={assets} />
        </div>
      </div>
    </div>
  );
}

function MemoryLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-[var(--color-slate-100)] rounded w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="data-card p-4">
            <div className="h-3 bg-[var(--color-slate-100)] rounded w-20 mb-2" />
            <div className="h-7 bg-[var(--color-slate-100)] rounded w-8" />
          </div>
        ))}
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="data-card p-4">
          <div className="h-4 bg-[var(--color-slate-100)] rounded w-48 mb-3" />
          <div className="h-3 bg-[var(--color-slate-100)] rounded w-full mb-2" />
          <div className="h-3 bg-[var(--color-slate-100)] rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function MemoryPage() {
  return (
    <Suspense fallback={<MemoryLoading />}>
      <MemoryContent />
    </Suspense>
  );
}
