import { cn } from "@/lib/utils/utils"
import { useEffect, useRef, useState, useCallback } from "react"
import React from "react"

const useAutoScroll = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean
) => {
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  const lastScrollTopRef = useRef(0)
  const autoScrollingRef = useRef(false)
  const userScrollingRef = useRef(false)
  const [newMessageAdded, setNewMessageAdded] = useState(false)
  const prevChildrenCountRef = useRef(0)
  const scrollTriggeredRef = useRef(false)
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)

  // Increased the threshold to prevent flickering when content expands
  const isAtBottom = useCallback((element: HTMLDivElement) => {
    const { scrollTop, scrollHeight, clientHeight } = element
    return scrollHeight - scrollTop - clientHeight <= 100
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current
    if (!container) return
    
    // If user is actively scrolling up, don't interrupt
    if (userScrollingRef.current && !isAtBottom(container)) {
      return
    }

    autoScrollingRef.current = true
    scrollTriggeredRef.current = true
    
    const targetScrollTop = container.scrollHeight - container.clientHeight

    container.scrollTo({
      top: targetScrollTop,
      behavior: behavior
    })

    // Use a single reliable cleanup mechanism with improved timing
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current)
    }
    
    scrollTimeout.current = setTimeout(() => {
      autoScrollingRef.current = false
      scrollTriggeredRef.current = false
      scrollTimeout.current = null
    }, 300)
  }, [containerRef, isAtBottom])

  useEffect(() => {
    if (!enabled) return

    const container = containerRef?.current
    if (!container) return

    lastScrollTopRef.current = container.scrollTop

    const handleScroll = () => {
      if (autoScrollingRef.current) return

      const currentScrollTop = container.scrollTop
      const wasAtBottom = isAtBottom(container)
      
      // Only disable auto-scroll if user is actually scrolling up
      if (currentScrollTop < lastScrollTopRef.current && 
          autoScrollEnabled && 
          Math.abs(currentScrollTop - lastScrollTopRef.current) > 10) {
        setAutoScrollEnabled(false)
        userScrollingRef.current = true
        
        // Reset user scrolling state after a short delay
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current)
        }
        
        scrollTimeout.current = setTimeout(() => {
          userScrollingRef.current = false
          scrollTimeout.current = null
        }, 300)
      }

      // Re-enable auto-scroll if user scrolls back to bottom
      if (wasAtBottom && !autoScrollEnabled) {
        setAutoScrollEnabled(true)
      }

      lastScrollTopRef.current = currentScrollTop
    }

    const handleWheel = (e: WheelEvent) => {
      // Mark that user is actively scrolling if scrolling up
      if (e.deltaY < 0) {
        userScrollingRef.current = true
        
        // Reset user scrolling after a delay
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current)
        }
        
        scrollTimeout.current = setTimeout(() => {
          userScrollingRef.current = false
          scrollTimeout.current = null
        }, 300)
        
        if (autoScrollEnabled) {
          setAutoScrollEnabled(false)
        }
      }
    }

    const handleTouchStart = () => {
      lastScrollTopRef.current = container.scrollTop
    }

    const handleTouchMove = () => {
      if (container.scrollTop < lastScrollTopRef.current && 
          autoScrollEnabled && 
          Math.abs(container.scrollTop - lastScrollTopRef.current) > 10) {
        setAutoScrollEnabled(false)
        userScrollingRef.current = true
      }

      lastScrollTopRef.current = container.scrollTop
    }

    const handleTouchEnd = () => {
      // Reset user scrolling state after touch ends
      setTimeout(() => {
        userScrollingRef.current = false
      }, 300)
      
      if (isAtBottom(container) && !autoScrollEnabled) {
        setAutoScrollEnabled(true)
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    container.addEventListener("wheel", handleWheel, { passive: true })
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    })
    container.addEventListener("touchmove", handleTouchMove, { passive: true })
    container.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener("scroll", handleScroll)
      container.removeEventListener("wheel", handleWheel)
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
      
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
    }
  }, [containerRef, enabled, autoScrollEnabled, isAtBottom])

  return {
    autoScrollEnabled,
    scrollToBottom,
    isScrolling: autoScrollingRef.current,
    scrollTriggered: scrollTriggeredRef.current,
    userScrolling: userScrollingRef.current,
    newMessageAdded,
    setNewMessageAdded,
    prevChildrenCountRef,
  }
}

export type ChatContainerProps = {
  children: React.ReactNode
  className?: string
  autoScroll?: boolean
  scrollToRef?: React.RefObject<HTMLDivElement | null>
  ref?: React.RefObject<HTMLDivElement | null>
} & React.HTMLAttributes<HTMLDivElement>

function ChatContainer({
  className,
  children,
  autoScroll = true,
  scrollToRef,
  ref,
  ...props
}: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const localBottomRef = useRef<HTMLDivElement>(null)
  const bottomRef = scrollToRef || localBottomRef
  const chatContainerRef = ref || containerRef
  const prevChildrenRef = useRef<React.ReactNode>(null)
  const contentChangedWithoutNewMessageRef = useRef(false)

  const { 
    autoScrollEnabled, 
    scrollToBottom, 
    isScrolling,
    scrollTriggered,
    newMessageAdded,
    setNewMessageAdded,
    prevChildrenCountRef
  } = useAutoScroll(
    chatContainerRef,
    autoScroll
  )

  // Improved content change detection
  useEffect(() => {
    const childrenArray = React.Children.toArray(children)
    const currentChildrenCount = childrenArray.length
    
    // Check if content is changing due to streaming or new message
    const isContentChange = prevChildrenRef.current !== children
    
    // New message detection
    if (currentChildrenCount > prevChildrenCountRef.current) {
      setNewMessageAdded(true)
    } 
    // Content update detection (like streaming) 
    else if (isContentChange) {
      contentChangedWithoutNewMessageRef.current = true
    }
    
    prevChildrenCountRef.current = currentChildrenCount
    prevChildrenRef.current = children
  }, [children, setNewMessageAdded])

  // Improved scroll behavior with more specific conditions
  useEffect(() => {
    if (!autoScroll) return
    
    const container = chatContainerRef.current
    if (!container) return
    
    // Handler for deciding when to auto-scroll
    const scrollHandler = () => {
      // Case 1: New message arrived - scroll to bottom if auto-scroll is enabled
      if (newMessageAdded && autoScrollEnabled) {
        scrollToBottom("smooth")
        setNewMessageAdded(false)
        contentChangedWithoutNewMessageRef.current = false
        return
      }
      
      // Case 2: Content is streaming or changing for existing message
      if (contentChangedWithoutNewMessageRef.current) {
        // Only auto-scroll if:
        // 1. Auto-scroll is enabled (user is at bottom)
        // 2. Not currently in manual scroll animation
        // 3. User isn't actively scrolling up
        if (autoScrollEnabled && !isScrolling && !scrollTriggered) {
          scrollToBottom("smooth")
        }
        contentChangedWithoutNewMessageRef.current = false
      }
    }
    
    // Use requestAnimationFrame for smooth performance
    requestAnimationFrame(scrollHandler)
    
  }, [
    children, 
    autoScroll, 
    autoScrollEnabled, 
    isScrolling,
    scrollTriggered,
    scrollToBottom, 
    newMessageAdded, 
    setNewMessageAdded
  ])

  return (
    <div
      className={cn("flex flex-col overflow-y-auto", className)}
      role="log"
      ref={chatContainerRef}
      {...props}
    >
      {children}
      <div
        ref={bottomRef}
        className="h-[1px] w-full shrink-0 scroll-mt-4"
        aria-hidden="true"
      />
    </div>
  )
}

export { ChatContainer, useAutoScroll }
