'use client';

import { cn } from "../utils";
import { forwardRef, HTMLAttributes } from 'react';

interface GlassContainerProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: 'low' | 'medium' | 'high';
  border?: boolean;
  hover?: boolean;
  blur?: 'sm' | 'md' | 'lg';
}

/**
 * @deprecated Use Card component with glass=true instead. This component will be removed in a future version.
 * Example: <Card glass intensity="medium" blur="md" border hover />
 * 
 * GlassContainer component - Creates a translucent glass-like container
 */
export const GlassContainer = forwardRef<HTMLDivElement, GlassContainerProps>(
  ({ 
    className, 
    intensity = 'medium', 
    border = true, 
    hover = true, 
    blur = 'md', 
    ...props 
  }, ref) => {
    
    const intensityStyles = {
      low: 'bg-black/20',
      medium: 'bg-black/40',
      high: 'bg-black/60'
    };
    
    const blurStyles = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-xl'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl',
          intensityStyles[intensity],
          blurStyles[blur],
          border && 'border border-white/10',
          hover && 'transition-all duration-300 hover:border-white/20 hover:bg-black/50',
          className
        )}
        {...props}
      />
    );
  }
);

GlassContainer.displayName = 'GlassContainer';