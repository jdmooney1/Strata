"use client";

import { useState } from "react";
import { Upload, ChevronDown, ChevronUp } from "lucide-react";
import { DocumentUploadForm } from "./upload-form";

interface Props {
  orgId: string;
  assetId?: string;
}

export function DocumentUploadSection({ orgId, assetId }: Props) {
  const [open, setOpen] = useState(false);

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
            onSuccess={() => {
              // Refresh the page to show the new document in the register
              window.location.reload();
            }}
          />
        </div>
      )}
    </div>
  );
}
