import { Plus } from 'lucide-react';
import { BaseTab } from '@/components/ui/base-tab';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export interface QuickActionsTabProps {
  onCreateConversation?: (title: string) => Promise<void>;
  onClick?: () => void;
}

export function QuickActionsTab({ onCreateConversation, onClick }: QuickActionsTabProps) {
  const handleClick = async () => {
    if (onClick) {
      onClick();
    } else if (onCreateConversation) {
      await onCreateConversation('Quick Action');
    }
  };

  const handleQuickAction = async (actionName: string) => {
    try {
      if (onCreateConversation) {
        await onCreateConversation(actionName);
        toast({
          title: "Success",
          description: `Created ${actionName}`,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create action",
        variant: "destructive",
      });
    }
  };

  const quickActions = [
    {
      id: 'new-chat',
      name: 'New Chat',
      description: 'Start a new conversation'
    },
    {
      id: 'summarize',
      name: 'Summarize',
      description: 'Summarize current content'
    },
    {
      id: 'code-explain',
      name: 'Explain Code',
      description: 'Get explanation for selected code'
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
          <BaseTab
            icon={<Plus className="w-3 h-3" />}
            label="Quick Actions"
            shortcut="Q"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[240px] max-h-[400px] mb-1.5 overflow-y-auto">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {quickActions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onSelect={() => handleQuickAction(action.name)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <div className="flex flex-col">
              <span className="text-sm">{action.name}</span>
              <span className="text-xs text-muted-foreground">{action.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 