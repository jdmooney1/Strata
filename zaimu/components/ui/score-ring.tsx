import React from 'react';

interface ScoreRingProps {
  score: number;
  /** Optional size override — defaults to 36px (matches .score-ring CSS) */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Show label below the ring */
  label?: string;
}

function getRingClass(score: number): string {
  if (score > 75) return 'score-ring-high';
  if (score > 50) return 'score-ring-medium';
  return 'score-ring-low';
}

const sizeClass = {
  sm: 'w-8 h-8 text-[0.625rem]',
  md: '',           // uses .score-ring default (36px)
  lg: 'w-12 h-12 text-sm',
};

export function ScoreRing({ score, size = 'md', className = '', label }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const ring = getRingClass(clamped);
  const extra = sizeClass[size];

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <span className={`score-ring ${ring} ${extra}`}>{clamped}</span>
      {label && (
        <span className="text-[0.625rem] text-[var(--color-text-muted)] text-center leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}
