export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { SortableTable, TableSkeleton, type Column } from '@/components/SortableTable';
import { KpiCard, KpiCardSkeleton } from '@/components/KpiCard';
import { getDividends } from '@/lib/db/queries';
import { formatCzk, formatDate } from '@/lib/calc/format';
import { DividendCharts } from './DividendCharts';

type DivRow = Awaited<ReturnType<typeof getDividends>>['rows'][number];

const columns: Column<DivRow>[] = [
  { key: 'ticker', label: 'Ticker', sortValue: (r) => r.ticker },
  { key: 'paidOn', label: 'Datum výplaty', render: (r) => formatDate(r.paidOn), sortValue: (r) => r.paidOn.getTime() },
  { key: 'quantity', label: 'Počet akcií', render: (r) => r.quantity?.toFixed(4) ?? '—', sortValue: (r) => r.quantity ?? 0 },
  { key: 'grossAmountCzk', label: 'Hrubá výplata CZK', render: (r) => formatCzk(r.grossAmountCzk), sortValue: (r) => r.grossAmountCzk },
  { key: 'taxWithheldCzk', label: 'Srážková daň CZK', render: (r) => formatCzk(r.taxWithheldCzk), sortValue: (r) => r.taxWithheldCzk },
  { key: 'amountCzk', label: 'Čistá výplata CZK', render: (r) => <span className="font-medium text-positive">{formatCzk(r.amountCzk)}</span>, sortValue: (r) => r.amountCzk },
];

async function DividendsContent() {
  const { rows, total, count, average, byTicker } = await getDividends();

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Celkové dividendy" value={formatCzk(total)} />
        <KpiCard label="Počet výplat" value={String(count)} />
        <KpiCard label="Průměr na výplatu" value={count ? formatCzk(average) : '—'} />
        <KpiCard label="Tickerů s dividendou" value={String(byTicker.length)} />
      </div>
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <DividendCharts rows={rows} byTicker={byTicker} />
      </div>
      <SortableTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rows={rows as unknown as Record<string, unknown>[]}
        defaultSortKey="paidOn"
        emptyMessage="Žádné dividendy"
      />
    </>
  );
}

export default function DividendsPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Dividendy</h2>
      <Suspense
        fallback={
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
            </div>
            <div className="mb-6 h-64 rounded-lg border border-border shimmer" />
            <TableSkeleton cols={6} />
          </>
        }
      >
        <DividendsContent />
      </Suspense>
    </div>
  );
}
