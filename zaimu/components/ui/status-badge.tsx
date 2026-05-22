import React from 'react';

type StatusColor = 'green' | 'amber' | 'red' | 'blue' | 'gray';

interface StatusBadgeProps {
  label: string;
  color?: StatusColor;
  /** Auto-detect color from common status label strings */
  status?: string;
  className?: string;
}

/** Maps common status strings to a color. Falls back to 'gray'. */
function resolveColor(status: string): StatusColor {
  const s = status.toLowerCase();
  if (['compliant', 'active', 'current', 'performing', 'paid', 'approved', 'cleared'].some(k => s.includes(k))) return 'green';
  if (['watch', 'warning', 'pending', 'review', 'at risk', 'deferred', 'partial'].some(k => s.includes(k))) return 'amber';
  if (['breach', 'default', 'critical', 'overdue', 'failed', 'rejected', 'expired'].some(k => s.includes(k))) return 'red';
  if (['in progress', 'processing', 'draft', 'pipeline', 'submitted'].some(k => s.includes(k))) return 'blue';
  return 'gray';
}

const dotClass: Record<StatusColor, string> = {
  green: 'status-dot-green',
  amber: 'status-dot-amber',
  red:   'status-dot-red',
  blue:  'status-dot-blue',
  gray:  'status-dot-gray',
};

const textClass: Record<StatusColor, string> = {
  green: 'text-[var(--color-status-green)]',
  amber: 'text-[var(--color-status-amber)]',
  red:   'text-[var(--color-status-red)]',
  blue:  'text-[var(--color-status-blue)]',
  gray:  'text-[var(--color-slate-500)]',
};

export function StatusBadge({ label, color, status, className = '' }: StatusBadgeProps) {
  const resolved: StatusColor = color ?? (status ? resolveColor(status) : resolveColor(label));

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`status-dot ${dotClass[resolved]}`} />
      <span className={`text-xs font-medium ${textClass[resolved]}`}>{label}</span>
    </span>
  );
}
