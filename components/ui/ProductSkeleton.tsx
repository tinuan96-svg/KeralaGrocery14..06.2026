export default function ProductSkeleton() {
  return (
    <div className="bg-white rounded-[2rem] p-3 flex flex-col gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.02)] animate-pulse">
      {/* Image Area */}
      <div className="aspect-square bg-gray-100 rounded-[1.5rem]" />

      {/* Content Area */}
      <div className="space-y-2 px-1 pb-2">
        <div className="h-3 w-3/4 bg-gray-100 rounded-full" />
        <div className="h-3 w-1/2 bg-gray-50 rounded-full" />

        <div className="flex justify-between items-center pt-2">
          <div className="h-5 w-12 bg-green-50 rounded-full" />
          <div className="h-8 w-8 bg-emerald-50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
