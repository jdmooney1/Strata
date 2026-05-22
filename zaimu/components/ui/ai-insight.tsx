import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIInsightProps {
  content: React.ReactNode;
  riskFlags?: string[];
  className?: string;
  /** Optional custom label — defaults to "AI Analysis" */
  label?: string;
}

export function AIInsight({
  content,
  riskFlags,
  className = '',
  label = 'AI Analysis',
}: AIInsightProps) {
  return (
    <div className={`ai-insight ${className}`}>
      {/* Label badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="size-3 text-[var(--color-navy-500)]" />
        <span className="ai-insight-label">{label}</span>
      </div>

      {/* Main content */}
      <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
        {content}
      </div>

      {/* Risk flags list */}
      {riskFlags && riskFlags.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {riskFlags.map((flag, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-xs text-[var(--color-status-amber)]"
            >
              <span className="mt-0.5 flex-shrink-0 size-1.5 rounded-full bg-[var(--color-status-amber)] mt-1.5" />
              {flag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
