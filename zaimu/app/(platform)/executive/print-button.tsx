'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-navy-300)] transition-colors"
      style={{ borderRadius: '2px' }}
    >
      Print / Export PDF
    </button>
  );
}
