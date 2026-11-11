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
  Legend,
  type TooltipProps,
} from 'recharts';
import { formatCzk } from '@/lib/calc/format';

interface TxRow { dateTime: Date; amountCzk: number; type: string }

const tip = ({ active, payload, label }: TooltipProps<number, string>) =>
  active && payload?.length ? (
    <div className="rounded border border-border bg-card p-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCzk(p.value ?? 0)}</p>
      ))}
    </div>
  ) : null;

export function CashflowCharts({ deposits, withdrawals }: { deposits: TxRow[]; withdrawals: TxRow[] }) {
  // Monthly bar data.
  const monthlyMap = new Map<string, { deposits: number; withdrawals: number }>();
  for (const d of deposits) {
    const m = d.dateTime.toISOString().slice(0, 7);
    const e = monthlyMap.get(m) ?? { deposits: 0, withdrawals: 0 };
    e.deposits += d.amountCzk;
    monthlyMap.set(m, e);
  }
  for (const w of withdrawals) {
    const m = w.dateTime.toISOString().slice(0, 7);
    const e = monthlyMap.get(m) ?? { deposits: 0, withdrawals: 0 };
    e.withdrawals += Math.abs(w.amountCzk);
    monthlyMap.set(m, e);
  }
  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  // Cumulative invested line.
  const all = [...deposits, ...withdrawals].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  let cum = 0;
  const cumData = all.map((t) => ({
    date: t.dateTime.toISOString().slice(0, 10),
    cumCzk: (cum += t.amountCzk),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Měsíční cashflow</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip content={tip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="deposits" name="Vklady" fill="rgb(var(--positive))" radius={[2, 2, 0, 0]} />
            <Bar dataKey="withdrawals" name="Výběry" fill="rgb(var(--negative))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">Kumulativně vloženo</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={cumData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip content={tip} />
            <Line dataKey="cumCzk" name="Vloženo" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
