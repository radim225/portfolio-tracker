interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
}

export function KpiCard({ label, value, sub, positive, negative }: KpiCardProps) {
  const valueClass = positive
    ? 'text-positive'
    : negative
      ? 'text-negative'
      : 'text-fg';

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 h-3 w-20 rounded shimmer" />
      <div className="h-6 w-32 rounded shimmer" />
      <div className="mt-1 h-3 w-16 rounded shimmer" />
    </div>
  );
}
