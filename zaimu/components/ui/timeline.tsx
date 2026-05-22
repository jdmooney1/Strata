import React from 'react';

type TimelineEventStatus = 'completed' | 'upcoming' | 'overdue' | 'pending';

export interface TimelineEvent {
  id: string | number;
  title: string;
  description?: string;
  date: string;
  status?: TimelineEventStatus;
  /** Optional badge/tag text */
  tag?: string;
  /** Optional icon to render instead of the default dot */
  icon?: React.ReactNode;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const dotBorderColor: Record<TimelineEventStatus, string> = {
  completed: 'border-[var(--color-status-green)] bg-[var(--color-status-green-bg)]',
  upcoming:  'border-[var(--color-navy-400)] bg-[var(--color-navy-50)]',
  overdue:   'border-[var(--color-status-red)] bg-[var(--color-status-red-bg)]',
  pending:   'border-[var(--color-status-amber)] bg-[var(--color-status-amber-bg)]',
};

const tagColor: Record<TimelineEventStatus, string> = {
  completed: 'badge-green',
  upcoming:  'badge-navy',
  overdue:   'badge-red',
  pending:   'badge-amber',
};

export function Timeline({ events, className = '' }: TimelineProps) {
  return (
    <div className={className}>
      {events.map((event) => {
        const status = event.status ?? 'upcoming';
        const dotColors = dotBorderColor[status];
        const tag = tagColor[status];

        return (
          <div key={event.id} className="timeline-item">
            {/* Dot */}
            {event.icon ? (
              <div className="absolute left-0 top-0.5 size-[11px] flex items-center justify-center">
                {event.icon}
              </div>
            ) : (
              <div className={`timeline-dot ${dotColors}`} />
            )}

            {/* Content */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-snug">
                  {event.title}
                </p>
                {event.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-snug">
                    {event.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[0.6875rem] text-[var(--color-text-muted)] whitespace-nowrap">
                  {event.date}
                </span>
                {event.tag ? (
                  <span className={`badge ${tag}`}>{event.tag}</span>
                ) : (
                  <span className={`badge ${tag}`}>{status}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
