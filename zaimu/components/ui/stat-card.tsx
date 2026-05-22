import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type TrendDirection = 'up' | 'down';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  trend?: {
    direction: TrendDirection;
    value: string;
    /** Override default color semantics — 'up' = green by default */
    inverted?: boolean;
  };
  className?: string;
}

export function StatCard({ label, value, subtext, trend, className = '' }: StatCardProps) {
  let trendColor = '';
  if (trend) {
    const positive = trend.inverted
      ? trend.direction === 'down'
      : trend.direction === 'up';
    trendColor = positive
      ? 'text-[var(--color-status-green)]'
      : 'text-[var(--color-status-red)]';
  }

  return (
    <div className={`data-card data-card-body ${className}`}>
      {/* Label — small caps */}
      <p className="section-label mb-2">{label}</p>

      {/* Value */}
      <p className="text-2xl font-semibold font-numeric tracking-tight text-[var(--color-text-primary)] leading-none">
        {value}
      </p>

      {/* Subtext + trend row */}
      {(subtext || trend) && (
        <div className="flex items-center gap-2 mt-1.5">
          {subtext && (
            <span className="text-xs text-[var(--color-text-muted)]">{subtext}</span>
          )}
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
              {trend.direction === 'up' ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
