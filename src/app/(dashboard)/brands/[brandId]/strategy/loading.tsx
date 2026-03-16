export default function StrategyLoading() {
  return (
    <div className="p-8 max-w-6xl mx-auto animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
      <div className="h-8 w-64 bg-gray-200 rounded-lg mb-2" />
      <div className="h-4 w-48 bg-gray-100 rounded mb-8" />
      <div className="bg-gray-800 rounded-2xl p-6 mb-8">
        <div className="h-6 w-48 bg-gray-600 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-700 rounded-xl p-4 h-32" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`bg-white rounded-xl border border-gray-200 p-6 ${i === 0 ? "lg:col-span-2" : ""}`}>
            <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
