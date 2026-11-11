export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { KpiCard, KpiCardSkeleton } from '@/components/KpiCard';
import { PortfolioChart, ChartSkeleton } from '@/components/PortfolioChart';
import { StatusBar, StatusBarSkeleton } from '@/components/StatusBar';
import { getPortfolioOverview, getPortfolioTimeline, getCashflow } from '@/lib/db/queries';
import { buildTimeline } from '@/lib/calc/timeline';
import { formatCzk, formatPct, formatPnl } from '@/lib/calc/format';

async function KpiCards() {
  const kpis = await getPortfolioOverview();
  const unreal = formatPnl(kpis.unrealizedPnlCzk);
  const total = formatPnl(kpis.totalReturnCzk);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="Celková hodnota" value={formatCzk(kpis.totalValueCzk)} />
      <KpiCard
        label="Nerealizovaný P&L"
        value={unreal.text}
        sub={formatPct(kpis.unrealizedPnlPct)}
        positive={unreal.positive}
        negative={!unreal.positive}
      />
      <KpiCard label="Realizovaný P&L" value={formatCzk(kpis.realizedPnlCzk)} />
      <KpiCard label="Celkové dividendy" value={formatCzk(kpis.dividendsCzk)} />
      <KpiCard label="Dividend yield" value={formatPct(kpis.avgDividendYieldPct)} />
      <KpiCard
        label="Celkový výnos"
        value={total.text}
        sub={formatPct(kpis.totalReturnPct)}
        positive={total.positive}
        negative={!total.positive}
      />
    </div>
  );
}

async function TimelineSection() {
  const [snaps, deposits] = await Promise.all([
    getPortfolioTimeline(),
    getCashflow({ type: 'DEPOSIT' }),
  ]);
  const timeline = buildTimeline(snaps);
  const depositMarkers = deposits.map((d) => ({
    date: d.dateTime.toISOString().slice(0, 10),
    amountCzk: d.amountCzk,
  }));
  return <PortfolioChart data={timeline} deposits={depositMarkers} />;
}

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<StatusBarSkeleton />}>
        <StatusBar />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)}
          </div>
        }
      >
        <KpiCards />
      </Suspense>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-semibold">Vývoj portfolia</h2>
        <Suspense fallback={<ChartSkeleton />}>
          <TimelineSection />
        </Suspense>
      </section>
    </div>
  );
}
