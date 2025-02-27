export function ChatMessagesSkeleton() {
  return (
    <div className="relative flex-1 flex flex-col">
      <div className="messages-container absolute inset-0 overflow-y-auto py-12 px-4 pb-52">
        <div className="max-w-[85%] mx-auto">
          <div className="space-y-12 min-h-full animate-pulse">
            {/* AI Message Skeleton */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white/[0.03] border-white/[0.1]">
                <div className="w-5 h-5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 space-y-2 overflow-hidden max-w-[85%]">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-20 h-4 bg-white/10 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded w-full" />
                  <div className="h-4 bg-white/10 rounded w-4/5" />
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                </div>
              </div>
            </div>

            {/* User Message Skeleton */}
            <div className="flex items-start gap-4 justify-end">
              <div className="flex-1 space-y-2 overflow-hidden max-w-[85%] text-right">
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4 ml-auto" />
                  <div className="h-4 bg-white/10 rounded w-1/2 ml-auto" />
                </div>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white/[0.03] border-white/[0.1]">
                <div className="w-5 h-5 rounded-full bg-white/10" />
              </div>
            </div>

            {/* Another AI Message Skeleton */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white/[0.03] border-white/[0.1]">
                <div className="w-5 h-5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 space-y-2 overflow-hidden max-w-[85%]">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-20 h-4 bg-white/10 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded w-full" />
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-4 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 