"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Calendar, Building2 } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  assetType: string;
  country: string;
}

const WORKFLOW_TYPES = [
  { value: "REFINANCING",            label: "Refinancing" },
  { value: "LEASE_RENEWAL",          label: "Lease Renewal" },
  { value: "VALUATION_UPDATE",       label: "Valuation Update" },
  { value: "MONTHLY_REPORTING",      label: "Monthly Reporting" },
  { value: "INSURANCE_RENEWAL",      label: "Insurance Renewal" },
  { value: "COVENANT_REPORTING",     label: "Covenant Reporting" },
  { value: "CAPEX_APPROVAL",         label: "CapEx Approval" },
  { value: "ACQUISITION_ONBOARDING", label: "Acquisition Onboarding" },
  { value: "CUSTOM",                 label: "Custom" },
];

export function WorkflowCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [assetId, setAssetId] = useState("");
  const [workflowType, setWorkflowType] = useState("REFINANCING");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/assets?limit=100")
      .then((r) => r.json())
      .then((data: { assets?: Asset[] }) => {
        if (Array.isArray(data.assets)) setAssets(data.assets);
      })
      .catch(() => {});
  }, []);

  // Auto-generate title when type/asset changes
  useEffect(() => {
    if (!title || title === prevAutoTitle.current) {
      const asset = assets.find((a) => a.id === assetId);
      const typeLabel = WORKFLOW_TYPES.find((t) => t.value === workflowType)?.label ?? workflowType;
      const generated = asset ? `${typeLabel} — ${asset.name}` : typeLabel;
      setTitle(generated);
      prevAutoTitle.current = generated;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, workflowType, assets]);

  const prevAutoTitle = { current: "" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!assetId) { setError("Please select an asset."); return; }
    if (!title.trim()) { setError("Title is required."); return; }

    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        workflowType,
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: targetDate || undefined,
        notes: notes.trim() || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Failed to create workflow");
      return;
    }

    const id = (data as { workflow?: { id?: string } }).workflow?.id;
    if (id) {
      startTransition(() => router.push(`/workflows/${id}`));
    } else {
      startTransition(() => router.push("/workflows"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="text-sm px-4 py-3 rounded-md"
          style={{
            background: "var(--color-status-red-light, #fff5f5)",
            color: "var(--color-status-red)",
            border: "1px solid var(--color-status-red)",
          }}
        >
          {error}
        </div>
      )}

      {/* Asset */}
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
          <Building2 className="size-3.5 inline mr-1" />
          Asset
        </label>
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-400)]"
          required
        >
          <option value="">Select an asset…</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.country})
            </option>
          ))}
        </select>
      </div>

      {/* Workflow type */}
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
          <GitBranch className="size-3.5 inline mr-1" />
          Workflow Type
        </label>
        <select
          value={workflowType}
          onChange={(e) => setWorkflowType(e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-400)]"
        >
          {WORKFLOW_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-400)]"
          placeholder="Workflow title"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
          Description <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-400)]"
          placeholder="Brief description of this workflow…"
        />
      </div>

      {/* Target date */}
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
          <Calendar className="size-3.5 inline mr-1" />
          Target Completion Date <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
        </label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-400)]"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
          Notes <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-navy-400)]"
          placeholder="Internal notes or context…"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/workflows")}
          className="text-sm px-4 py-2 rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="text-sm font-semibold px-5 py-2 rounded-md bg-[var(--color-navy-700)] text-white hover:bg-[var(--color-navy-800)] disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create Workflow"}
        </button>
      </div>
    </form>
  );
}
