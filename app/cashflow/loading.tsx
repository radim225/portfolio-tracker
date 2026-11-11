import { KpiCardSkeleton } from '@/components/KpiCard';
import { TableSkeleton } from '@/components/SortableTable';
export default function Loading() {
  return (
    <div>
      <div className="mb-4 h-7 w-28 rounded shimmer" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
      <div className="mb-6 h-56 rounded-lg border border-border shimmer" />
      <TableSkeleton cols={4} />
    </div>
  );
}
