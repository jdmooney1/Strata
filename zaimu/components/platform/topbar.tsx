'use client';

import React, { useState } from 'react';
import { Search, Bell } from 'lucide-react';

interface TopbarProps {
  title?: string;
  /** Number of notifications to display — defaults to 3 */
  notificationCount?: number;
}

const CURRENT_DATE_JA = '2026年5月22日';
const ORG_NAME_JA = '三洋キャピタルホールディングス';
const USER_INITIALS = 'KY';

export function Topbar({ title, notificationCount = 3 }: TopbarProps) {
  const [lang, setLang] = useState<'ja' | 'en'>('ja');

  return (
    <header className="page-header">
      {/* Left: page title */}
      {title && (
        <h1 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
          {title}
        </h1>
      )}

      {/* Right: controls */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Date + org */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs text-[var(--color-text-secondary)] font-medium">
            {CURRENT_DATE_JA}
          </span>
          <span className="text-[0.625rem] text-[var(--color-text-muted)] leading-tight">
            {ORG_NAME_JA}
          </span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-6 w-px bg-[var(--color-border)]" />

        {/* Language toggle */}
        <div className="flex items-center rounded-md border border-[var(--color-border)] overflow-hidden text-xs font-medium">
          <button
            onClick={() => setLang('ja')}
            className={[
              'px-2 py-1 transition-colors duration-100',
              lang === 'ja'
                ? 'bg-[var(--color-navy-900)] text-white'
                : 'bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)]',
            ].join(' ')}
            aria-pressed={lang === 'ja'}
            aria-label="Japanese"
          >
            日本語
          </button>
          <button
            onClick={() => setLang('en')}
            className={[
              'px-2 py-1 transition-colors duration-100',
              lang === 'en'
                ? 'bg-[var(--color-navy-900)] text-white'
                : 'bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-50)]',
            ].join(' ')}
            aria-pressed={lang === 'en'}
            aria-label="English"
          >
            EN
          </button>
        </div>

        {/* Search */}
        <button
          className="flex items-center justify-center size-8 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-100)] hover:text-[var(--color-text-primary)] transition-colors duration-100"
          aria-label="Search"
        >
          <Search className="size-4" />
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            className="flex items-center justify-center size-8 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-slate-100)] hover:text-[var(--color-text-primary)] transition-colors duration-100"
            aria-label={`Notifications (${notificationCount} unread)`}
          >
            <Bell className="size-4" />
          </button>
          {notificationCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-status-red)] text-white text-[0.5625rem] font-bold leading-none"
              aria-hidden="true"
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </div>

        {/* User avatar */}
        <div
          className="flex items-center justify-center size-8 rounded-full bg-[var(--color-navy-900)] text-white text-xs font-bold flex-shrink-0 select-none"
          aria-label="Kenji Yamamoto"
          title="Kenji Yamamoto"
        >
          {USER_INITIALS}
        </div>
      </div>
    </header>
  );
}
