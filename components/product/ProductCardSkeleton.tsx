import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden border border-gray-100 bg-white rounded-2xl flex flex-col h-full">
      {/* Image — matches h-[160px] sm:h-[180px] md:h-[220px] */}
      <Skeleton className="h-[160px] sm:h-[180px] md:h-[220px] w-full rounded-none flex-shrink-0" />
      <div className="px-2.5 pt-2 pb-2.5 flex flex-col gap-0">
        {/* Category — h-5 */}
        <Skeleton className="h-4 w-16 rounded-full mb-1" />
        {/* Name — h-[34px] */}
        <div className="mb-1.5 space-y-1">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-4/5 rounded" />
        </div>
        {/* Price — h-6 */}
        <div className="flex items-center justify-between h-6 mb-1.5">
          <Skeleton className="h-4 w-14 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
        {/* Button — h-8 */}
        <Skeleton className="h-8 w-full rounded-xl mt-auto" />
      </div>
    </Card>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
