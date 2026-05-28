import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WorkflowCreateForm } from "@/app/(platform)/workflows/workflow-create-form";

export const metadata: Metadata = { title: "New Workflow" };

export default function NewWorkflowPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link
        href="/workflows"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Operational Workflows
      </Link>

      <div className="data-card">
        <div className="data-card-header">
          <h1 className="text-base font-semibold">New Workflow</h1>
        </div>
        <div className="p-5">
          <p className="text-sm text-[var(--color-text-secondary)] mb-5">
            Create a structured workflow from a system template. Steps, approvals, and dependencies are generated automatically based on the workflow type.
          </p>
          <WorkflowCreateForm />
        </div>
      </div>
    </div>
  );
}
