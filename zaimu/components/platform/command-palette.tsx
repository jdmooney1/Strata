'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, GitBranch, FileBarChart, CheckSquare } from 'lucide-react';

type ResultKind = 'asset' | 'workflow' | 'report' | 'task';

interface SearchResult {
  kind: ResultKind;
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

const KIND_ICON: Record<ResultKind, React.ElementType> = {
  asset: Building2,
  workflow: GitBranch,
  report: FileBarChart,
  task: CheckSquare,
};

const KIND_LABEL: Record<ResultKind, string> = {
  asset: 'ASSET',
  workflow: 'WORKFLOW',
  report: 'REPORT',
  task: 'TASK',
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 200);
  }

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) { navigate(results[selected].href); }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white shadow-xl"
        style={{ borderRadius: '2px', border: '1px solid var(--color-border-strong)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 border-b border-[var(--color-border)]" style={{ height: '48px' }}>
          <Search className="size-4 text-[var(--color-text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Search assets, workflows, reports…"
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-[var(--color-text-muted)]"
          />
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] border border-[var(--color-border)] px-1.5 py-0.5 flex-shrink-0">ESC</span>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border)]">
            {results.map((r, i) => {
              const Icon = KIND_ICON[r.kind];
              return (
                <li key={r.id}>
                  <button
                    className={[
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === selected
                        ? 'bg-[var(--color-navy-50,#f0f4ff)]'
                        : 'hover:bg-[var(--color-slate-50)]',
                    ].join(' ')}
                    onClick={() => navigate(r.href)}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <Icon className="size-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--color-text-primary)] block truncate">{r.label}</span>
                      <span className="text-xs text-[var(--color-text-muted)] truncate">{r.sublabel}</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold text-[var(--color-text-muted)] tracking-wider flex-shrink-0">
                      {KIND_LABEL[r.kind]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-4 text-sm text-[var(--color-text-muted)] text-center">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center gap-3">
          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">↑↓ navigate</span>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">↵ open</span>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">⌘K toggle</span>
        </div>
      </div>
    </div>
  );
}
