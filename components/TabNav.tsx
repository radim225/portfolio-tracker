'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Přehled' },
  { href: '/positions', label: 'Otevřené pozice' },
  { href: '/closed', label: 'Uzavřené obchody' },
  { href: '/dividends', label: 'Dividendy' },
  { href: '/cashflow', label: 'Cashflow' },
];

export function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
      {tabs.map((t) => {
        const active = t.href === '/' ? pathname === '/' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-accent text-white'
                : 'text-muted hover:bg-border hover:text-fg'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
