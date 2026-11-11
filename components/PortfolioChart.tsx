'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  DotProps,
  type TooltipProps,
} from 'recharts';
import { formatCzk, formatDate } from '@/lib/calc/format';
import type { SnapshotPoint } from '@/lib/calc/timeline';

type Range = '1M' | '3M' | '6M' | 'YTD' | 'MAX';

const RANGES: Range[] = ['1M', '3M', '6M', 'YTD', 'MAX'];

function filterByRange(points: SnapshotPoint[], range: Range): SnapshotPoint[] {
  if (range === 'MAX') return points;
  const now = new Date();
  const from = new Date(now);
  if (range === '1M') from.setMonth(from.getMonth() - 1);
  else if (range === '3M') from.setMonth(from.getMonth() - 3);
  else if (range === '6M') from.setMonth(from.getMonth() - 6);
  else if (range === 'YTD') from.setMonth(0, 1);
  const fromStr = from.toISOString().slice(0, 10);
  return points.filter((p) => p.date >= fromStr);
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border bg-card p-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCzk(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

interface SnapshotDotProps extends DotProps {
  payload?: SnapshotPoint;
}

function SnapshotDot({ cx, cy, payload }: SnapshotDotProps) {
  if (!payload || payload.source !== 'snapshot') return null;
  return <circle cx={cx} cy={cy} r={3} fill="rgb(var(--accent))" stroke="none" />;
}

interface PortfolioChartProps {
  data: SnapshotPoint[];
  deposits: { date: string; amountCzk: number }[];
}

export function PortfolioChart({ data, deposits }: PortfolioChartProps) {
  const [range, setRange] = useState<Range>('MAX');
  const filtered = filterByRange(data, range);
  const depositLines = deposits.filter(
    (d) => d.amountCzk > 5000 && filtered.some((p) => p.date === d.date),
  );

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              r === range ? 'bg-accent text-white' : 'border border-border hover:bg-border'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={filtered} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {depositLines.map((d) => (
            <ReferenceLine key={d.date} x={d.date} stroke="rgb(var(--positive))" strokeDasharray="3 3" strokeWidth={1} />
          ))}
          <Line
            type="monotone"
            dataKey="totalValueCzk"
            name="Hodnota portfolia"
            stroke="rgb(var(--accent))"
            strokeWidth={2}
            dot={<SnapshotDot />}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="investedCzk"
            name="Vloženo"
            stroke="rgb(var(--muted))"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartSkeleton() {
  return <div className="h-80 rounded-lg shimmer" />;
}
