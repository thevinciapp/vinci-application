import * as React from "react"

import { cn } from "@/shared/utils/cn-utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-sm text-white/90 placeholder:text-white/40 outline-hidden focus:bg-white/[0.03] focus:border-white/[0.1] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
