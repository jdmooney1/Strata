'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  FileText,
  CheckSquare,
  Bell,
  ShieldAlert,
  GitBranch,
  DollarSign,
  FileBarChart,
  Archive,
  ClipboardList,
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
    title: 'Situation',
    items: [
      { href: '/dashboard',  label: 'Command Centre',     Icon: LayoutDashboard },
      { href: '/risk',       label: 'Risk Monitor',       Icon: ShieldAlert },
      { href: '/executive',  label: 'Executive Summary',  Icon: ClipboardList },
    ],
  },
  {
    title: 'Portfolio',
    items: [
      { href: '/assets',     label: 'Assets',          Icon: Building2 },
      { href: '/portfolio',  label: 'Portfolio',        Icon: BarChart3 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/workflows',  label: 'Workflows',        Icon: GitBranch },
      { href: '/tasks',      label: 'Tasks',            Icon: CheckSquare },
      { href: '/alerts',     label: 'Alerts',           Icon: Bell },
      { href: '/documents',  label: 'Documents',        Icon: FileText },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/treasury',   label: 'Treasury & FX',   Icon: DollarSign },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { href: '/reports',    label: 'Board Reports',   Icon: FileBarChart },
      { href: '/memory',     label: 'AI Memory',       Icon: Archive },
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
        <div className="flex flex-col leading-none">
          <span className="text-white font-semibold text-sm tracking-wide">ZAIMU</span>
          <span className="text-white/35 mt-0.5" style={{ fontSize: '9px' }}>三洋 Capital</span>
        </div>
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
            三洋キャピタル
          </p>
        </div>
      </div>
    </aside>
  );
}
