export default function CatalogSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="h-40 bg-gray-100" />
          <div className="p-4 flex flex-col gap-3">
            <div className="space-y-1.5">
              <div className="h-3.5 bg-gray-100 rounded w-full" />
              <div className="h-3.5 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/3 mt-1" />
            </div>
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-5 bg-gray-100 rounded-full w-20" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-6 bg-gray-100 rounded w-12" />
              <div className="h-8 bg-gray-100 rounded-xl w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
