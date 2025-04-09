import { cn } from '@/shared/lib/utils';

/**
 * @deprecated Use the Badge component with variant="active"|"info"|"count" and size="sm" instead.
 * Example: <Badge variant="active" size="sm">Active</Badge>
 * This component will be removed in a future version.
 */
interface CommandBadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'info' | 'count';
  className?: string;
}

export function CommandBadge({ children, variant = 'info', className }: CommandBadgeProps) {
  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded-md text-[10px] font-medium',
        variant === 'active' && 'bg-[#3ecfff]/10 text-[#3ecfff] border border-[#3ecfff]/20',
        variant === 'info' && 'text-white/40 border border-white/10',
        variant === 'count' && 'bg-white/5 text-white/60',
        className
      )}
    >
      {children}
    </span>
  );
}
