import { getSyncStatus } from '@/lib/db/queries';
import { formatDate } from '@/lib/calc/format';

export async function StatusBar() {
  const { latest, counts } = await getSyncStatus();
  const lastSync = latest
    ? `${formatDate(latest.finishedAt ?? latest.startedAt)} — ${latest.status === 'ok' ? '✓ OK' : '✗ Chyba'}`
    : 'Dosud nesyncováno';

  return (
    <div className="mb-4 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
      <span>Poslední sync: {lastSync}</span>
      <span>Snapshotů: {counts?.snapshots ?? '…'}</span>
      <span>Orderů: {counts?.orders ?? '…'}</span>
      <span>Dividend: {counts?.dividends ?? '…'}</span>
      <span>Transakcí: {counts?.transactions ?? '…'}</span>
    </div>
  );
}

export function StatusBarSkeleton() {
  return <div className="mb-4 h-7 rounded-md shimmer" />;
}
