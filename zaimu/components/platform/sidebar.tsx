'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Layers,
  FileText,
  CheckSquare,
  Bell,
  DollarSign,
  FileBarChart,
  Archive,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  Icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard',  label: 'Dashboard',          Icon: LayoutDashboard },
      { href: '/portfolio',  label: 'Portfolio',           Icon: BarChart3 },
    ],
  },
  {
    title: 'Assets',
    items: [
      { href: '/assets',     label: 'All Assets',          Icon: Building2 },
      { href: '/assets',     label: 'Asset Intelligence',  Icon: Layers },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/documents',  label: 'Documents',           Icon: FileText },
      { href: '/tasks',      label: 'Tasks',               Icon: CheckSquare },
      { href: '/alerts',     label: 'Alerts',              Icon: Bell },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/treasury',   label: 'Treasury & FX',       Icon: DollarSign },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { href: '/reports',    label: 'Board Reports',       Icon: FileBarChart },
      { href: '/memory',     label: 'Memory',              Icon: Archive },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-center size-7 rounded bg-white text-[var(--color-navy-900)] font-bold text-sm select-none flex-shrink-0">
          Z
        </div>
        <span className="text-white font-semibold text-sm tracking-wide">ZAIMU</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {/* Section header */}
            <p
              className="px-2 mb-1"
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.30)',
              }}
            >
              {section.title}
            </p>

            {/* Items */}
            <ul className="space-y-0.5">
              {section.items.map((item, idx) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                return (
                  <li key={`${item.href}-${idx}`}>
                    <Link
                      href={item.href}
                      className={[
                        'flex items-center gap-2.5 px-3 rounded-md transition-colors duration-100',
                        'text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/5',
                      ].join(' ')}
                      style={{ height: '36px' }}
                    >
                      <item.Icon className="size-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom — user info */}
      <div className="flex items-center gap-2.5 px-3 py-3 border-t border-white/10 flex-shrink-0">
        {/* Avatar */}
        <div
          className="flex items-center justify-center size-8 rounded-full flex-shrink-0 text-xs font-bold text-[var(--color-navy-900)]"
          style={{ background: 'rgba(255,255,255,0.85)' }}
          aria-label="Kenji Yamamoto"
        >
          KY
        </div>

        {/* Name + org */}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/90 truncate leading-tight">
            Kenji Yamamoto
          </p>
          <p className="text-[0.625rem] text-white/40 truncate leading-tight mt-0.5">
            Sanyo Capital Holdings
          </p>
        </div>
      </div>
    </aside>
  );
}
