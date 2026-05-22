'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T, index: number) => void;
  rowKey?: keyof T | ((row: T) => string | number);
  className?: string;
  emptyMessage?: string;
  striped?: boolean;
  stickyHeader?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

function getValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  rowKey,
  className = '',
  emptyMessage = 'No data available',
  striped = true,
  stickyHeader = true,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  function handleSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortKey(null);
      setSortDir(null);
    } else {
      setSortDir('asc');
    }
  }

  const sorted = React.useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  function getRowKey(row: T, index: number): string | number {
    if (!rowKey) return index;
    if (typeof rowKey === 'function') return rowKey(row);
    return (row[rowKey] as string | number) ?? index;
  }

  const alignClass: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`overflow-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
          <tr className="bg-[var(--color-slate-50)] border-b border-[var(--color-border)]">
            {columns.map((col) => {
              const key = col.key as string;
              const align = col.align ?? 'left';
              const isSorted = sortKey === key;

              return (
                <th
                  key={key}
                  className={[
                    'px-3 py-2 whitespace-nowrap select-none',
                    alignClass[align],
                    col.sortable ? 'cursor-pointer hover:bg-[var(--color-slate-100)]' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="text-[var(--color-text-muted)]">
                        {isSorted && sortDir === 'asc' ? (
                          <ChevronUp className="size-3" />
                        ) : isSorted && sortDir === 'desc' ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, idx) => {
              const isEven = idx % 2 === 1;
              return (
                <tr
                  key={getRowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                  className={[
                    'border-b border-[var(--color-border)] last:border-0',
                    striped && isEven ? 'bg-[var(--color-surface-alt)]' : 'bg-[var(--color-surface)]',
                    onRowClick ? 'table-row-hover' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {columns.map((col) => {
                    const key = col.key as string;
                    const rawValue = getValue(row, key);
                    const align = col.align ?? 'left';

                    return (
                      <td
                        key={key}
                        className={`px-3 py-2 text-sm text-[var(--color-text-primary)] ${alignClass[align]}`}
                      >
                        {col.render ? col.render(rawValue, row, idx) : (rawValue as React.ReactNode)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
