export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { SortableTable, TableSkeleton, type Column } from '@/components/SortableTable';
import { KpiCard, KpiCardSkeleton } from '@/components/KpiCard';
import { getClosedTrades } from '@/lib/db/queries';
import { calcClosedTradeStats } from '@/lib/calc/kpis';
import { formatCzk, formatPct, formatDate, formatPnl } from '@/lib/calc/format';
import type { ClosedTrade } from '@/lib/calc/fifo';

type TradeRow = ClosedTrade & { dividendsDuringHoldCzk: number };

const columns: Column<TradeRow>[] = [
  { key: 'ticker', label: 'Ticker', sortValue: (r) => r.ticker },
  { key: 'openDate', label: 'Otevřeno', render: (r) => formatDate(r.openDate), sortValue: (r) => r.openDate.getTime() },
  { key: 'closeDate', label: 'Zavřeno', render: (r) => formatDate(r.closeDate), sortValue: (r) => r.closeDate.getTime() },
  { key: 'quantity', label: 'Počet', render: (r) => r.quantity.toFixed(4), sortValue: (r) => r.quantity },
  { key: 'avgBuyPrice', label: 'Nák. cena CZK', render: (r) => formatCzk(r.avgBuyPrice), sortValue: (r) => r.avgBuyPrice },
  { key: 'sellPrice', label: 'Prod. cena CZK', render: (r) => formatCzk(r.sellPrice), sortValue: (r) => r.sellPrice },
  {
    key: 'pnlCzk',
    label: 'P&L CZK',
    render: (r) => {
      const { text, positive } = formatPnl(r.pnlCzk);
      return <span className={positive ? 'text-positive' : 'text-negative'}>{text}</span>;
    },
    sortValue: (r) => r.pnlCzk,
  },
  {
    key: 'pnlPct',
    label: 'P&L %',
    render: (r) => {
      const pos = r.pnlPct >= 0;
      return <span className={pos ? 'text-positive' : 'text-negative'}>{(r.pnlPct >= 0 ? '+' : '') + r.pnlPct.toFixed(2)} %</span>;
    },
    sortValue: (r) => r.pnlPct,
  },
  { key: 'holdingDays', label: 'Dnů', sortValue: (r) => r.holdingDays },
  { key: 'dividendsDuringHoldCzk', label: 'Div. za držení CZK', render: (r) => formatCzk(r.dividendsDuringHoldCzk), sortValue: (r) => r.dividendsDuringHoldCzk },
];

async function ClosedTradesContent() {
  const trades = await getClosedTrades();
  const stats = calcClosedTradeStats(trades);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <KpiCard label="Celkový P&L" value={formatCzk(stats.totalPnlCzk)} positive={stats.totalPnlCzk >= 0} negative={stats.totalPnlCzk < 0} />
        <KpiCard label="Win rate" value={formatPct(stats.winRatePct)} />
        <KpiCard label="Průměr na obchod" value={formatCzk(stats.avgPnlCzk)} />
        <KpiCard label="Průměrná doba" value={`${Math.round(stats.avgHoldingDays)} dní`} />
        <KpiCard label="Ziskových" value={`${stats.winCount} / ${stats.winCount + stats.lossCount}`} />
        <KpiCard label="Obchodů celkem" value={String(trades.length)} />
      </div>
      <SortableTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rows={trades as unknown as Record<string, unknown>[]}
        defaultSortKey="closeDate"
        emptyMessage="Žádné uzavřené obchody"
      />
    </>
  );
}

export default function ClosedPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Uzavřené obchody</h2>
      <Suspense
        fallback={
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)}
            </div>
            <TableSkeleton cols={10} />
          </>
        }
      >
        <ClosedTradesContent />
      </Suspense>
    </div>
  );
}
