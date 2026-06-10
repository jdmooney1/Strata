'use client';

import React from 'react';
import { Search, Bell } from 'lucide-react';

interface TopbarProps {
  title?: string;
  notificationCount?: number;
}

const CURRENT_DATE = '01 Jun 2026';
const ORG_SHORT = 'SCH · Tokyo';
const USER_INITIALS = 'KY';

export function Topbar({ title, notificationCount = 3 }: TopbarProps) {
  return (
    <header className="page-header">
      {/* Left: empty spacer (page titles come from h1 in page content) */}
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-mono text-[var(--color-text-muted)]"
          style={{ letterSpacing: '0.04em' }}
        >
          {CURRENT_DATE}
        </span>
        <span className="text-xs text-[var(--color-border-strong)]">|</span>
        <span
          className="text-xs text-[var(--color-text-muted)] font-medium"
        >
          {ORG_SHORT}
        </span>
      </div>

      {/* Right: utility controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search — shows ⌘K hint; actual palette is triggered by Cmd+K globally */}
        <button
          className="flex items-center gap-1.5 px-2 h-7 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Search (⌘K)"
          title="Search (⌘K)"
        >
          <Search className="size-3.5 flex-shrink-0" />
          <span className="text-[10px] font-mono border border-[var(--color-border)] px-1 py-0.5 leading-none">
            ⌘K
          </span>
        </button>

        {/* Notification */}
        <div className="relative">
          <button
            className="flex items-center justify-center size-7 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label={`Notifications (${notificationCount} unread)`}
          >
            <Bell className="size-3.5" />
          </button>
          {notificationCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-3.5 px-1 bg-[var(--color-status-red)] text-white text-[0.5rem] font-bold leading-none"
              style={{ borderRadius: '2px' }}
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-[var(--color-border)]" />

        {/* User chip */}
        <div
          className="flex items-center justify-center size-6 bg-[var(--color-navy-800)] text-white text-[0.5625rem] font-bold flex-shrink-0 select-none"
          style={{ borderRadius: '2px' }}
          aria-label="Kenji Yamamoto"
          title="Kenji Yamamoto — Fund Manager"
        >
          {USER_INITIALS}
        </div>
      </div>
    </header>
  );
}
