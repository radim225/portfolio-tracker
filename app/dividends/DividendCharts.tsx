'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  type TooltipProps,
} from 'recharts';
import { formatCzk } from '@/lib/calc/format';

interface DivRow {
  paidOn: Date;
  ticker: string;
  amountCzk: number;
}

interface ByTicker { ticker: string; amountCzk: number }

function buildMonthly(rows: DivRow[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const month = r.paidOn.toISOString().slice(0, 7);
    map.set(month, (map.get(month) ?? 0) + r.amountCzk);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, amountCzk]) => ({ month, amountCzk }));
}

function buildCumulative(rows: DivRow[]) {
  const sorted = [...rows].sort((a, b) => a.paidOn.getTime() - b.paidOn.getTime());
  let cum = 0;
  return sorted.map((r) => ({ date: r.paidOn.toISOString().slice(0, 10), cumCzk: (cum += r.amountCzk) }));
}

const tip = ({ active, payload, label }: TooltipProps<number, string>) =>
  active && payload?.length ? (
    <div className="rounded border border-border bg-card p-2 text-xs shadow-md">
      <p>{label}</p>
      <p className="font-medium text-positive">{formatCzk(payload[0]?.value ?? 0)}</p>
    </div>
  ) : null;

export function DividendCharts({ rows, byTicker }: { rows: DivRow[]; byTicker: ByTicker[] }) {
  const monthly = buildMonthly(rows);
  const cumulative = buildCumulative(rows);
  const top10 = byTicker.slice(0, 10);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div>
        <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Měsíčně (CZK)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip content={tip} />
            <Bar dataKey="amountCzk" fill="rgb(var(--positive))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Podle tickeru (top 10)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={top10} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v)}`} />
            <YAxis dataKey="ticker" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
            <Tooltip content={tip} />
            <Bar dataKey="amountCzk" fill="rgb(var(--accent))" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Kumulativní (CZK)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={cumulative}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip content={tip} />
            <Line dataKey="cumCzk" stroke="rgb(var(--positive))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
