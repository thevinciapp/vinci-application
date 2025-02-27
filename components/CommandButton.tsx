import React from 'react';
import { Button } from '@/components/ui/common/button';
import { useCommandCenter } from '@/hooks/useCommandCenter';
import { Command } from 'lucide-react';
import { CommandType } from '@/hooks/useCommandCenter';

interface CommandButtonProps {
  className?: string;
  label?: string;
  showIcon?: boolean;
  showShortcut?: boolean;
  type?: CommandType;
}

export function CommandButton({
  className,
  label = 'Command Menu',
  showIcon = true,
  showShortcut = true,
  type,
}: CommandButtonProps) {
  const { openCommandCenter, openCommandType } = useCommandCenter();

  const handleClick = () => {
    if (type) {
      openCommandType(type);
    } else {
      openCommandCenter();
    }
  };

  return (
    <Button
      variant="ghost"
      className={className}
      onClick={handleClick}
    >
      {showIcon && <Command className="mr-2 h-4 w-4" />}
      {label}
      {showShortcut && (
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      )}
    </Button>
  );
}

/**
 * A button that opens the command center with a specific command type pre-selected
 */
export function TypedCommandButton({
  className,
  label,
  type,
  icon,
  shortcutKeys,
}: {
  className?: string;
  label: string;
  type: CommandType;
  icon?: React.ReactNode;
  shortcutKeys?: string[];
}) {
  const { openCommandType } = useCommandCenter();

  return (
    <Button
      variant="ghost"
      className={className}
      onClick={() => openCommandType(type)}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
      {shortcutKeys && (
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {shortcutKeys.map((key, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="mx-0.5">+</span>}
              <span className="text-xs">{key}</span>
            </React.Fragment>
          ))}
        </kbd>
      )}
    </Button>
  );
}

export default CommandButton; 