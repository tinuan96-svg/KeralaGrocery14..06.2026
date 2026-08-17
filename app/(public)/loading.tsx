export default function Loading() {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="bg-orange-500 h-10 animate-pulse" />

      <div className="sticky top-16 z-40 bg-white border-b border-gray-200 h-14 animate-pulse" />

      <div className="relative bg-gradient-to-br from-green-900 via-green-800 to-green-900 h-[280px] md:h-[320px] animate-pulse" />

      <section className="py-4 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      <div className="h-48 bg-gray-50 animate-pulse rounded-xl mx-4 my-6" />

      <section className="py-4 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
