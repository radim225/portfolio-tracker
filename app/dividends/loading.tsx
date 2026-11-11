import { KpiCardSkeleton } from '@/components/KpiCard';
import { TableSkeleton } from '@/components/SortableTable';
export default function Loading() {
  return (
    <div>
      <div className="mb-4 h-7 w-32 rounded shimmer" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
      <div className="mb-6 h-56 rounded-lg border border-border shimmer" />
      <TableSkeleton cols={6} />
    </div>
  );
}
