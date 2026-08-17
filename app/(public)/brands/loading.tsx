import { Skeleton } from '@/components/ui/skeleton';

export default function BrandsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Popular brands skeleton */}
      <div className="pt-5 pb-2">
        <div className="flex items-center gap-2 px-4 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-3 px-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[76px]">
              <Skeleton className="w-16 h-16 rounded-2xl" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-2.5 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* A-Z skeleton */}
      <div className="mt-4 px-4">
        <Skeleton className="h-4 w-28 mb-3" />
        {/* Letter index */}
        <div className="flex gap-1 mb-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="w-7 h-7 rounded-lg flex-shrink-0" />
          ))}
        </div>
        {/* Letter groups */}
        {Array.from({ length: 4 }).map((_, g) => (
          <div key={g} className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
              <Skeleton className="h-px flex-1" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-3">
                  <Skeleton className="w-10 h-10 rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                  <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
