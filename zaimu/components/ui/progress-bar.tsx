import React from 'react';

interface ProgressBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  /** Height override in px — defaults to 5px via CSS */
  height?: number;
}

function getFillColor(value: number): string {
  if (value > 75) return 'bg-[var(--color-status-green)]';
  if (value > 50) return 'bg-[var(--color-status-amber)]';
  return 'bg-[var(--color-status-red)]';
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  className = '',
  height,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fillColor = getFillColor(clamped);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <span className="text-xs text-[var(--color-text-secondary)] truncate">{label}</span>
          )}
          {showPercentage && (
            <span className="text-xs font-medium font-numeric text-[var(--color-text-primary)] flex-shrink-0">
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        className="progress-bar"
        style={height ? { height: `${height}px` } : undefined}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`progress-bar-fill ${fillColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
