export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { SortableTable, TableSkeleton, type Column } from '@/components/SortableTable';
import { KpiCard, KpiCardSkeleton } from '@/components/KpiCard';
import { getCashflow } from '@/lib/db/queries';
import { formatCzk, formatDate } from '@/lib/calc/format';
import { CashflowCharts } from './CashflowCharts';

type TxRow = Awaited<ReturnType<typeof getCashflow>>[number];

const columns: Column<TxRow>[] = [
  { key: 'dateTime', label: 'Datum', render: (r) => formatDate(r.dateTime), sortValue: (r) => r.dateTime.getTime() },
  { key: 'type', label: 'Typ', sortValue: (r) => r.type },
  {
    key: 'amountCzk',
    label: 'Částka CZK',
    render: (r) => (
      <span className={r.amountCzk >= 0 ? 'text-positive font-medium' : 'text-negative'}>
        {(r.amountCzk >= 0 ? '+' : '') + formatCzk(r.amountCzk)}
      </span>
    ),
    sortValue: (r) => r.amountCzk,
  },
  { key: 'reference', label: 'Reference', render: (r) => <span className="text-xs text-muted">{r.reference ?? '—'}</span> },
];

async function CashflowContent() {
  const allTxs = await getCashflow();
  const deposits = allTxs.filter((t) => t.type === 'DEPOSIT');
  const withdrawals = allTxs.filter((t) => t.type === 'WITHDRAW');
  const interest = allTxs.filter((t) => t.type === 'INTEREST_ON_CASH');
  const cashback = allTxs.filter((t) => t.type === 'CASHBACK');

  const totalDeposits = deposits.reduce((s, t) => s + t.amountCzk, 0);
  const totalWithdrawals = Math.abs(withdrawals.reduce((s, t) => s + t.amountCzk, 0));
  const totalInterest = interest.reduce((s, t) => s + t.amountCzk, 0);
  const totalCashback = cashback.reduce((s, t) => s + t.amountCzk, 0);
  const net = totalDeposits - totalWithdrawals;

  const investmentTxs = allTxs.filter((t) => t.type === 'DEPOSIT' || t.type === 'WITHDRAW');
  const extraTxs = allTxs.filter((t) => t.type === 'INTEREST_ON_CASH' || t.type === 'CASHBACK');

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <KpiCard label="Celkem vloženo" value={formatCzk(totalDeposits)} />
        <KpiCard label="Celkem vybráno" value={formatCzk(totalWithdrawals)} />
        <KpiCard label="Čistý cashflow" value={formatCzk(net)} positive={net >= 0} negative={net < 0} />
        <KpiCard label="Úroky na hotovosti" value={formatCzk(totalInterest)} />
        <KpiCard label="Cashback" value={formatCzk(totalCashback)} />
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <CashflowCharts deposits={deposits} withdrawals={withdrawals} />
      </div>

      <h3 className="mb-2 text-sm font-semibold">Vklady a výběry</h3>
      <SortableTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rows={investmentTxs as unknown as Record<string, unknown>[]}
        defaultSortKey="dateTime"
        emptyMessage="Žádné transakce"
      />

      {extraTxs.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 text-sm font-semibold">Úroky a cashback</h3>
          <SortableTable
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            rows={extraTxs as unknown as Record<string, unknown>[]}
            defaultSortKey="dateTime"
            emptyMessage="Žádné záznamy"
          />
        </>
      )}
    </>
  );
}

export default function CashflowPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Cashflow</h2>
      <Suspense
        fallback={
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)}
            </div>
            <div className="mb-6 h-56 rounded-lg border border-border shimmer" />
            <TableSkeleton cols={4} />
          </>
        }
      >
        <CashflowContent />
      </Suspense>
    </div>
  );
}
