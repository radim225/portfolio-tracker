'use client';

import { useState } from 'react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  className?: string;
}

interface SortableTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  emptyMessage?: string;
}

export function SortableTable<T extends Record<string, unknown>>({
  columns,
  rows,
  defaultSortKey,
  defaultSortDir = 'desc',
  emptyMessage = 'Žádná data',
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>(defaultSortKey ?? (columns[0]?.key as string) ?? '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);

  const sorted = [...rows].sort((a, b) => {
    const col = columns.find((c) => c.key === sortKey);
    const va = col?.sortValue ? col.sortValue(a) : ((a[sortKey] as string | number) ?? '');
    const vb = col?.sortValue ? col.sortValue(b) : ((b[sortKey] as string | number) ?? '');
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggle = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card text-muted">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key as string}
                className={`cursor-pointer select-none px-3 py-2.5 text-left font-medium hover:text-fg ${col.className ?? ''}`}
                onClick={() => toggle(col.key as string)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr key={i} className="hover:bg-border/40">
                {columns.map((col) => (
                  <td key={col.key as string} className={`px-3 py-2 ${col.className ?? ''}`}>
                    {col.render ? col.render(row) : (row[col.key as string] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableSkeleton({ cols = 5, rows = 8 }: { cols?: number; rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-3 py-2.5">
                <div className="h-3 w-16 rounded shimmer" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-3 py-2">
                  <div className="h-4 w-full max-w-24 rounded shimmer" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
