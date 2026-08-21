export default function ProductCardSkeleton() {
  return (
    <div className="card-soft overflow-hidden bg-white rounded-[2rem] flex flex-col h-full shadow-[0_10px_30px_rgba(0,0,0,0.03)] animate-pulse">
      {/* Image Area */}
      <div className="aspect-square w-full bg-gray-50 relative overflow-hidden rounded-[1.75rem] m-2">
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div className="w-16 h-16 bg-emerald-900 rounded-full" />
        </div>
      </div>

      <div className="px-4 pt-2 pb-5 flex flex-col gap-3 flex-1">
        {/* Name */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-gray-100 rounded-full" />
          <div className="h-3 w-2/3 bg-gray-100 rounded-full opacity-60" />
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="h-5 w-14 bg-green-50 rounded-full" />
          <div className="h-9 w-9 bg-emerald-50 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
