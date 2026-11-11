export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { SortableTable, TableSkeleton, type Column } from '@/components/SortableTable';
import { KpiCard, KpiCardSkeleton } from '@/components/KpiCard';
import { getOpenPositions, getPortfolioOverview } from '@/lib/db/queries';
import { formatCzk, formatPct, formatNum, formatPnl } from '@/lib/calc/format';

type PositionRow = Awaited<ReturnType<typeof getOpenPositions>>[number];

const columns: Column<PositionRow>[] = [
  { key: 'ticker', label: 'Ticker', sortValue: (r) => r.ticker },
  { key: 'name', label: 'Název', render: (r) => <span className="text-muted text-xs">{r.name ?? r.ticker}</span> },
  { key: 'quantity', label: 'Počet', render: (r) => formatNum(r.quantity), sortValue: (r) => r.quantity },
  { key: 'averagePrice', label: 'Prům. nák. (CZK)', render: (r) => formatCzk(r.averagePrice), sortValue: (r) => r.averagePrice },
  { key: 'currentPrice', label: 'Akt. cena (CZK)', render: (r) => formatCzk(r.currentPrice), sortValue: (r) => r.currentPrice },
  { key: 'valueCzk', label: 'Hodnota (CZK)', render: (r) => formatCzk(r.valueCzk), sortValue: (r) => r.valueCzk },
  {
    key: 'pplCzk',
    label: 'P&L CZK',
    render: (r) => {
      const { text, positive } = formatPnl(r.pplCzk);
      return <span className={positive ? 'text-positive' : 'text-negative'}>{text}</span>;
    },
    sortValue: (r) => r.pplCzk,
  },
  {
    key: 'pplPct',
    label: 'P&L %',
    render: (r) => {
      const pos = r.pplPct >= 0;
      return <span className={pos ? 'text-positive' : 'text-negative'}>{(r.pplPct >= 0 ? '+' : '') + r.pplPct.toFixed(2)} %</span>;
    },
    sortValue: (r) => r.pplPct,
  },
  { key: 'dividendsCzk', label: 'Dividendy CZK', render: (r) => formatCzk(r.dividendsCzk), sortValue: (r) => r.dividendsCzk },
  {
    key: 'dividendYieldPct',
    label: 'Div yield',
    render: (r) => formatPct(r.dividendYieldPct),
    sortValue: (r) => r.dividendYieldPct,
  },
  {
    key: 'bar',
    label: '',
    render: (r) => {
      const pct = Math.min(100, Math.max(0, 50 + r.pplPct));
      return (
        <div className="h-1.5 w-20 rounded-full bg-border">
          <div
            className={`h-full rounded-full ${r.pplPct >= 0 ? 'bg-positive' : 'bg-negative'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      );
    },
  },
];

async function PositionsContent() {
  const [positions, kpis] = await Promise.all([getOpenPositions(), getPortfolioOverview()]);
  const totalValue = positions.reduce((s, p) => s + p.valueCzk, 0);
  const totalPpl = positions.reduce((s, p) => s + p.pplCzk, 0);
  const pplSign = formatPnl(totalPpl);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Počet pozic" value={String(positions.length)} />
        <KpiCard label="Hodnota pozic" value={formatCzk(totalValue)} />
        <KpiCard label="Nerealizovaný P&L" value={pplSign.text} positive={pplSign.positive} negative={!pplSign.positive} />
        <KpiCard label="Free cash" value={formatCzk(kpis.freeCashCzk)} />
      </div>
      <SortableTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rows={positions as unknown as Record<string, unknown>[]}
        defaultSortKey="valueCzk"
        emptyMessage="Žádné otevřené pozice"
      />
    </>
  );
}

export default function PositionsPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Otevřené pozice</h2>
      <Suspense
        fallback={
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
            </div>
            <TableSkeleton cols={11} />
          </>
        }
      >
        <PositionsContent />
      </Suspense>
    </div>
  );
}
