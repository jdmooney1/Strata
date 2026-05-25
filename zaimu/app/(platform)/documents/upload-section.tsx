"use client";

import { useState, useTransition } from "react";
import { Upload, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { DocumentUploadForm } from "./upload-form";

interface Props {
  orgId: string;
  assetId?: string;
}

export function DocumentUploadSection({ orgId, assetId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSuccess() {
    // Collapse the form
    setOpen(false);
    // Use Next.js router.refresh() — re-runs server data fetching without full reload
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="data-card">
      <button
        className="data-card-header w-full text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Upload className="size-4 text-[var(--color-navy-500)]" />
          <h2 className="text-sm font-semibold">Upload Document</h2>
          <p className="text-xs text-[var(--color-text-muted)] ml-1">
            ドキュメントのアップロード
          </p>
          {isPending && (
            <span className="text-xs text-[var(--color-text-muted)] ml-2 animate-pulse">
              Refreshing…
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="size-4 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown className="size-4 text-[var(--color-text-muted)]" />
        )}
      </button>

      {open && (
        <div className="data-card-body border-t border-[var(--color-border)]">
          <DocumentUploadForm
            orgId={orgId}
            assetId={assetId}
            onSuccess={handleSuccess}
          />
        </div>
      )}
    </div>
  );
}
