import clsx from 'clsx';

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={clsx('animate-pulse rounded bg-gray-200', className)}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-200 pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-2">
          {Array.from({ length: 5 }).map((_, colIdx) => (
            <SkeletonBlock key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <SkeletonBlock className="mb-4 h-5 w-1/3" />
      <SkeletonBlock className="mb-2 h-4 w-full" />
      <SkeletonBlock className="mb-2 h-4 w-2/3" />
      <SkeletonBlock className="h-4 w-1/2" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <SkeletonBlock className="mb-3 h-3 w-20" />
          <SkeletonBlock className="h-8 w-16" />
        </div>
        <SkeletonBlock className="h-12 w-12 rounded-full" />
      </div>
      <SkeletonBlock className="mt-4 h-3 w-24" />
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <SkeletonBlock className="mb-2 h-4 w-2/3" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
