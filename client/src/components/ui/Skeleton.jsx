export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function ItemGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <Skeleton className="h-40 rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
