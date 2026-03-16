export default function BrandLoading() {
  return (
    <div className="p-8 max-w-6xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-200" />
          <div>
            <div className="h-7 w-40 bg-gray-200 rounded-lg mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-lg" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="w-8 h-8 bg-gray-100 rounded-lg mb-2" />
            <div className="h-6 w-10 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-50 rounded-lg mb-2" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
            <div className="h-16 bg-gray-50 rounded-lg" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-50 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
