export function TabSkeleton() {
  return (
    <div className="flex items-center gap-2 animate-pulse">
      {/* Space Tab Skeleton */}
      <div className="px-3 py-1 rounded-t-lg backdrop-blur-2xl border border-white/[0.05] min-w-[100px]
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-white/10" />
          <div className="h-3 w-16 bg-white/10 rounded" />
        </div>
      </div>

      {/* Quick Actions Tab Skeleton */}
      <div className="px-3 py-1 rounded-t-lg backdrop-blur-2xl border border-white/[0.05]
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-white/10" />
          <div className="h-3 w-20 bg-white/10 rounded" />
        </div>
      </div>

      {/* Model Tab Skeleton */}
      <div className="px-3 py-1 rounded-t-lg backdrop-blur-2xl border border-white/[0.05] min-w-[120px]
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-white/10" />
          <div className="h-3 w-24 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  )
} 