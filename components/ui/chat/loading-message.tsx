import { FC } from 'react'

export const LoadingMessage: FC = () => {
  return (
    <div className="flex items-start gap-4 w-full mx-auto group">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-gradient-to-b from-white/[0.07] to-white/[0.03] border-white/[0.05] relative">
        <div className="absolute inset-0 rounded-md bg-blue-500/20" />
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/30" />
          <div className="absolute -inset-1 rounded-full bg-blue-500/20 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden max-w-[85%]">
        <div className="prose prose-invert max-w-none space-y-2">
          <div className="h-[22px] bg-white/10 rounded w-[35%] animate-pulse" />
          <div className="h-[22px] bg-white/10 rounded w-[55%] animate-pulse" />
          <div className="h-[22px] bg-white/10 rounded w-[75%] animate-pulse" />
        </div>
      </div>
    </div>
  )
} 