export interface SnapshotPoint {
  date: string; // 'YYYY-MM-DD'
  totalValueCzk: number;
  investedCzk: number;
  totalDepositsCzk: number;
  pnlCzk: number;
  source: 'snapshot' | 'interpolated';
}

export interface TimelineDeposit {
  date: string;
  amountCzk: number;
}

// Builds a daily timeline by:
// 1. Anchoring on known portfolio_snapshots (labelled 'snapshot').
// 2. Linearly interpolating total value between snapshot points.
// 3. Building cumulative invested capital from deposit transactions.
export function buildTimeline(
  snapshots: { date: string; totalValueCzk: number; investedCzk: number; totalDepositsCzk: number; totalPplCzk: number }[],
  _deposits?: TimelineDeposit[], // reserved for future use; currently derived from snapshot data
): SnapshotPoint[] {
  if (snapshots.length === 0) return [];

  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const points: SnapshotPoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const snap = sorted[i]!;
    const prev = sorted[i - 1];

    if (prev) {
      // Fill gap with linear interpolation.
      const from = new Date(prev.date);
      const to = new Date(snap.date);
      const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);

      for (let d = 1; d < days; d++) {
        const t = d / days;
        const interpDate = new Date(from.getTime() + d * 86_400_000)
          .toISOString()
          .slice(0, 10);
        points.push({
          date: interpDate,
          totalValueCzk: lerp(prev.totalValueCzk, snap.totalValueCzk, t),
          investedCzk: lerp(prev.investedCzk, snap.investedCzk, t),
          totalDepositsCzk: lerp(prev.totalDepositsCzk, snap.totalDepositsCzk, t),
          pnlCzk: lerp(prev.totalPplCzk, snap.totalPplCzk, t),
          source: 'interpolated',
        });
      }
    }

    points.push({
      date: snap.date,
      totalValueCzk: snap.totalValueCzk,
      investedCzk: snap.investedCzk,
      totalDepositsCzk: snap.totalDepositsCzk,
      pnlCzk: snap.totalPplCzk,
      source: 'snapshot',
    });
  }

  return points;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Filter a timeline to a date range and optional bucket granularity.
export function filterTimeline(
  points: SnapshotPoint[],
  opts: { from?: string; to?: string; bucket?: 'day' | 'week' | 'month' } = {},
): SnapshotPoint[] {
  let result = points;
  if (opts.from) result = result.filter((p) => p.date >= opts.from!);
  if (opts.to) result = result.filter((p) => p.date <= opts.to!);

  if (opts.bucket === 'week') {
    return bucketBy(result, (d) => {
      const dt = new Date(d);
      const day = dt.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day; // Monday
      const monday = new Date(dt.getTime() + diff * 86_400_000);
      return monday.toISOString().slice(0, 10);
    });
  }

  if (opts.bucket === 'month') {
    return bucketBy(result, (d) => d.slice(0, 7) + '-01');
  }

  return result;
}

function bucketBy(
  points: SnapshotPoint[],
  key: (date: string) => string,
): SnapshotPoint[] {
  const map = new Map<string, SnapshotPoint>();
  for (const p of points) {
    map.set(key(p.date), p); // last point in bucket wins
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
