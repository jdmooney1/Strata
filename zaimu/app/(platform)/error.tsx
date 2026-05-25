"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PlatformError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[platform/error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="size-12 rounded-full bg-[var(--color-status-red-bg)] flex items-center justify-center mb-4">
        <AlertTriangle className="size-6 text-[var(--color-status-red)]" />
      </div>

      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        Something went wrong
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-1">
        エラーが発生しました
      </p>

      {error.message && (
        <p className="text-xs text-[var(--color-text-muted)] max-w-sm mt-2 mb-5 font-mono bg-[var(--color-slate-50)] border border-[var(--color-border)] rounded-md px-3 py-2 text-left">
          {error.message}
        </p>
      )}

      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md text-white transition-colors"
        style={{ background: "var(--color-navy-700)" }}
      >
        <RefreshCcw className="size-3.5" />
        Try again
      </button>

      {error.digest && (
        <p className="text-xs text-[var(--color-text-muted)] mt-4">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
