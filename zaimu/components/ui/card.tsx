import React from 'react';

interface DataCardProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** If true, removes default body padding — useful for flush tables */
  flush?: boolean;
}

export function DataCard({
  header,
  children,
  className = '',
  bodyClassName = '',
  flush = false,
}: DataCardProps) {
  return (
    <div className={`data-card ${className}`}>
      {header !== undefined && (
        <div className="data-card-header">
          {typeof header === 'string' ? (
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className={flush ? bodyClassName : `data-card-body ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}

/** Convenience sub-components for composing card headers */
export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-sm font-semibold text-[var(--color-text-primary)] ${className}`}>
      {children}
    </h3>
  );
}

export function CardActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 flex-shrink-0">{children}</div>;
}
