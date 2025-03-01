"use client"

import * as React from "react"
import { ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/common/button"

export type ScrollButtonProps = {
  containerRef: React.RefObject<HTMLElement | null>
  scrollRef?: React.RefObject<HTMLElement | null>
  className?: string
  onClick?: () => void
}

export function ScrollButton({
  containerRef,
  scrollRef,
  className,
  onClick,
}: ScrollButtonProps) {
  const [visible, setVisible] = React.useState(false)

  const handleClick = React.useCallback(() => {
    if (onClick) {
      onClick()
      return
    }

    if (scrollRef?.current) {
      scrollRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      })
      return
    }

    if (containerRef?.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [containerRef, scrollRef, onClick])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Show button when not at the bottom
      setVisible(scrollHeight - scrollTop - clientHeight > 10)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    // Initial check
    handleScroll()

    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [containerRef])

  if (!visible) return null

  return (
    <Button
      size="icon"
      variant="outline"
      className={cn(
        "size-8 rounded-full bg-background/80 backdrop-blur transition-opacity hover:bg-background",
        className
      )}
      onClick={handleClick}
    >
      <ArrowDown className="size-4" />
      <span className="sr-only">Scroll to bottom</span>
    </Button>
  )
} 