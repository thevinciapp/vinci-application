'use client';

import { cn } from "shared/lib/utils";
import { forwardRef, HTMLAttributes } from 'react';

interface GradientTextProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'purple' | 'mixed' | 'custom';
}

/**
 * GradientText component - Creates text with a gradient fill
 */
export const GradientText = forwardRef<HTMLSpanElement, GradientTextProps>(
  ({ className, variant = 'blue', children, ...props }, ref) => {
    const gradientStyles = {
      blue: 'bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent',
      purple: 'bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent',
      mixed: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent',
      custom: 'bg-clip-text text-transparent'
    };

    return (
      <span 
        ref={ref}
        className={cn(gradientStyles[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

GradientText.displayName = 'GradientText';