import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function PlatformNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="size-12 rounded-full bg-[var(--color-slate-100)] flex items-center justify-center mb-4">
        <FileQuestion className="size-6 text-[var(--color-text-muted)]" />
      </div>

      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        Page not found
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-5">
        ページが見つかりません — The resource you requested does not exist.
      </p>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md text-white transition-colors"
        style={{ background: "var(--color-navy-700)" }}
      >
        <ArrowLeft className="size-3.5" />
        Back to Dashboard
      </Link>
    </div>
  );
}
