'use client';

import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type BannerSeverity = 'critical' | 'high' | 'medium' | 'info';

interface AlertBannerProps {
  severity?: BannerSeverity;
  title: string;
  message?: string;
  /** If provided, renders a clickable action link */
  actionLabel?: string;
  onAction?: () => void;
  /** Controlled dismiss — if provided, component is controlled */
  onDismiss?: () => void;
  /** Whether the banner is shown (controlled mode) */
  visible?: boolean;
  className?: string;
}

const severityConfig: Record<
  BannerSeverity,
  { bg: string; border: string; textColor: string; Icon: React.ElementType }
> = {
  critical: {
    bg: 'bg-[var(--color-status-red-bg)]',
    border: 'border-l-4 border-l-[var(--color-status-red)]',
    textColor: 'text-[var(--color-status-red)]',
    Icon: AlertCircle,
  },
  high: {
    bg: 'bg-[var(--color-status-amber-bg)]',
    border: 'border-l-4 border-l-[var(--color-status-amber)]',
    textColor: 'text-[var(--color-status-amber)]',
    Icon: AlertTriangle,
  },
  medium: {
    bg: 'bg-[var(--color-status-blue-bg)]',
    border: 'border-l-4 border-l-[var(--color-status-blue)]',
    textColor: 'text-[var(--color-status-blue)]',
    Icon: Info,
  },
  info: {
    bg: 'bg-[var(--color-navy-50)]',
    border: 'border-l-4 border-l-[var(--color-navy-400)]',
    textColor: 'text-[var(--color-navy-700)]',
    Icon: Info,
  },
};

const severityLabel: Record<BannerSeverity, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  info: 'INFO',
};

export function AlertBanner({
  severity = 'critical',
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
  visible,
  className = '',
}: AlertBannerProps) {
  const [internalVisible, setInternalVisible] = useState(true);

  // Support both controlled and uncontrolled usage
  const isVisible = visible !== undefined ? visible : internalVisible;

  function handleDismiss() {
    setInternalVisible(false);
    onDismiss?.();
  }

  if (!isVisible) return null;

  const { bg, border, textColor, Icon } = severityConfig[severity];

  return (
    <div
      role="alert"
      className={[
        bg,
        border,
        'flex items-center gap-3 px-4 py-2.5 flex-shrink-0',
        className,
      ].join(' ')}
    >
      <Icon className={`size-4 flex-shrink-0 ${textColor}`} aria-hidden="true" />

      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className={`text-[0.625rem] font-bold tracking-widest uppercase flex-shrink-0 ${textColor}`}>
          {severityLabel[severity]}
        </span>
        <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
          {title}
        </span>
        {message && (
          <span className="text-xs text-[var(--color-text-secondary)] truncate hidden sm:inline">
            — {message}
          </span>
        )}
      </div>

      {actionLabel && (
        <button
          onClick={onAction}
          className={`flex-shrink-0 text-xs font-semibold underline underline-offset-2 ${textColor} hover:opacity-75 transition-opacity`}
        >
          {actionLabel}
        </button>
      )}

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 flex items-center justify-center size-6 rounded text-[var(--color-text-muted)] hover:bg-black/5 hover:text-[var(--color-text-primary)] transition-colors duration-100"
        aria-label="Dismiss alert"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
