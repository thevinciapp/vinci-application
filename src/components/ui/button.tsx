import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center text-sm font-medium transition-all duration-200 focus-visible:outline-hidden disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        transparent: "bg-transparent text-white",
        default: "bg-primary text-white hover:bg-primary/90",
        outline: "border border-white/[0.05] bg-white/[0.02] text-white/90 hover:bg-white/[0.05] hover:text-white backdrop-blur-xs",
        ghost: "text-white/70 hover:bg-white/[0.04] hover:text-white",
        toggle: "text-white/70 hover:bg-white/[0.04] hover:text-white border-t border-white/[0.05] rounded-t-md rounded-b-none",
        cyan: "bg-[#3ecfff]/10 text-[#3ecfff] border border-[#3ecfff]/20 shadow-[0_0_12px_rgba(62,207,255,0.1)] hover:bg-[#3ecfff]/20 rounded-xl",
        destructive: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20",
        gradient: "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-sm hover:from-indigo-600 hover:to-blue-600",
      },
      size: {
        default: "h-10 py-2 px-4 rounded-md",
        sm: "h-8 px-3 rounded-md",
        icon: "h-8 w-8 rounded-md",
        lg: "h-12 px-6 rounded-md",
      },
      rounded: {
        default: "rounded-md",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  active?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, active, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, rounded, className }), active && "bg-white/[0.05] text-white")}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

