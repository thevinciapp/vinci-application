import { useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { cn } from '@/lib/utils';

// Base styles for command items
const baseCommandItemClass = (isActive?: boolean) => cn(
  'group relative flex items-center gap-3 w-[calc(100%-16px)] min-h-[56px] mx-2 my-1 px-4 py-3 text-sm outline-none',
  'transition-all duration-200 rounded-lg',
  'data-[selected=true]:bg-white/[0.08] data-[selected=true]:border-white/20 data-[selected=true]:text-white',
  'hover:bg-white/[0.08] hover:border-white/20',
  isActive ? 'bg-white/[0.05] border border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)] text-white' : 'text-white/90 border border-transparent'
);

interface AnimatedCommandItemProps extends React.ComponentProps<typeof Command.Item> {
  isActive?: boolean;
}

export function AnimatedCommandItem({ children, className, isActive, ...props }: AnimatedCommandItemProps) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);
    props.onSelect?.(e.currentTarget.getAttribute('data-value') || '');
  }, [props.onSelect]);

  return (
    <Command.Item
      {...props}
      className={cn(
        baseCommandItemClass(isActive),
        isClicked && 'animate-command-item-click',
        className
      )}
      onSelect={undefined}
      onClick={handleClick}
    >
      {children}
    </Command.Item>
  );
}

// For backwards compatibility
export const commandItemClass = baseCommandItemClass;
