import { cn } from "@/shared/utils/cn-utils"
import React, { useRef } from "react"
import { useAutoScroll } from "@/hooks/use-auto-scroll";

export type ChatContainerProps = {
  children: React.ReactNode
  className?: string
  autoScroll?: boolean
  ref?: React.RefObject<HTMLDivElement | null>
} & React.HTMLAttributes<HTMLDivElement>

const ChatContainer = React.forwardRef<HTMLDivElement, ChatContainerProps>(
    ({
      className,
      children,
      autoScroll = true,
      ...props
    }, ref) => {
        
      const internalRef = useRef<HTMLDivElement>(null);
      const chatContainerRef = (ref || internalRef) as React.RefObject<HTMLDivElement>; 
      
      useAutoScroll(
        chatContainerRef,
        autoScroll
      );
      
      return (
        <div
          ref={chatContainerRef} 
          className={cn("flex flex-col overflow-y-auto", className)}
          style={{ overflowAnchor: 'auto' }}
          role="log"
          {...props}
        >
          {children}
        </div>
      )
    }
)

ChatContainer.displayName = "ChatContainer";

export { ChatContainer }
