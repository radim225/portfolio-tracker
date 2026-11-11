import { KpiCardSkeleton } from '@/components/KpiCard';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="mb-4 h-7 rounded-md shimmer" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
      <div className="h-80 rounded-lg border border-border shimmer" />
    </div>
  );
}
