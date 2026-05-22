import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

interface AlertItemProps {
  severity: AlertSeverity;
  title: string;
  message: string;
  assetName?: string;
  timestamp?: string;
  className?: string;
  onAction?: () => void;
  actionLabel?: string;
}

const severityConfig: Record<
  AlertSeverity,
  { border: string; bg: string; iconColor: string; Icon: React.ElementType }
> = {
  critical: {
    border:    'border-l-[3px] border-l-[var(--color-status-red)]',
    bg:        'bg-[var(--color-status-red-bg)]',
    iconColor: 'text-[var(--color-status-red)]',
    Icon:      AlertCircle,
  },
  high: {
    border:    'border-l-[3px] border-l-[var(--color-status-amber)]',
    bg:        'bg-[var(--color-status-amber-bg)]',
    iconColor: 'text-[var(--color-status-amber)]',
    Icon:      AlertTriangle,
  },
  medium: {
    border:    'border-l-[3px] border-l-[var(--color-status-blue)]',
    bg:        'bg-[var(--color-status-blue-bg)]',
    iconColor: 'text-[var(--color-status-blue)]',
    Icon:      Info,
  },
  low: {
    border:    'border-l-[3px] border-l-[var(--color-slate-400)]',
    bg:        'bg-[var(--color-slate-50)]',
    iconColor: 'text-[var(--color-slate-400)]',
    Icon:      Info,
  },
};

const severityLabel: Record<AlertSeverity, string> = {
  critical: 'CRITICAL',
  high:     'HIGH',
  medium:   'MEDIUM',
  low:      'LOW',
};

export function AlertItem({
  severity,
  title,
  message,
  assetName,
  timestamp,
  className = '',
  onAction,
  actionLabel = 'Review',
}: AlertItemProps) {
  const { border, bg, iconColor, Icon } = severityConfig[severity];

  return (
    <div
      className={`${border} ${bg} rounded-r-md px-3 py-2.5 flex items-start gap-3 ${className}`}
    >
      {/* Icon */}
      <Icon className={`size-4 flex-shrink-0 mt-0.5 ${iconColor}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[0.625rem] font-bold tracking-widest uppercase ${iconColor}`}>
            {severityLabel[severity]}
          </span>
          <span className="font-semibold text-xs text-[var(--color-text-primary)] truncate">
            {title}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">{message}</p>

        {/* Footer row */}
        {(assetName || timestamp) && (
          <div className="flex items-center gap-3 mt-1">
            {assetName && (
              <span className="text-[0.6875rem] text-[var(--color-text-muted)]">{assetName}</span>
            )}
            {timestamp && (
              <span className="text-[0.6875rem] text-[var(--color-text-muted)]">{timestamp}</span>
            )}
          </div>
        )}
      </div>

      {/* Optional action */}
      {onAction && (
        <button
          onClick={onAction}
          className="flex-shrink-0 text-xs font-medium text-[var(--color-navy-600)] hover:text-[var(--color-navy-900)] underline-offset-2 hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
