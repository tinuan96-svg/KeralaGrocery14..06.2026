import { Card } from '@/components/ui/card';

export default function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden border border-gray-100 bg-white rounded-2xl flex flex-col h-full shadow-sm">
      {/* Image — Shimmer Effect */}
      <div className="h-[160px] sm:h-[180px] md:h-[220px] w-full bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 shimmer" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-28 bg-gray-100 rounded-lg opacity-40" />
        </div>
      </div>

      <div className="px-2.5 pt-3 pb-3 flex flex-col gap-1.5 flex-1">
        {/* Category */}
        <div className="h-3.5 w-16 bg-gray-100 rounded-full relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-gray-100 rounded relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
          <div className="h-3 w-4/5 bg-gray-100 rounded relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto pt-2">
          <div className="h-5 w-12 bg-gray-100 rounded relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
          <div className="h-3 w-8 bg-gray-50 rounded relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>

        {/* Button */}
        <div className="h-8 w-full bg-gray-100 rounded-xl mt-2 relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>
      </div>
    </Card>
  );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
