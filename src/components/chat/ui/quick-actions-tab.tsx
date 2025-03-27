import { useState } from 'react';
import { Plus, RefreshCw, Clock } from 'lucide-react';
import { BaseTab } from '@/components/ui/base-tab';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from '@/components/shared/dropdown-list';

export interface QuickActionsTabProps {
  onCreateConversation?: (title: string) => Promise<void>;
  onClick?: () => void;
}

export function QuickActionsTab({ onCreateConversation, onClick }: QuickActionsTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  const handleClick = async () => {
    if (onClick) {
      onClick();
    } else if (onCreateConversation) {
      await onCreateConversation('Quick Action');
    }
  };

  const handleQuickAction = async (actionId: string) => {
    if (!onCreateConversation) return;
    
    // Find the action by ID
    const action = quickActions.find(a => a.id === actionId);
    if (!action) return;
    
    setIsCreating(true);
    try {
      await onCreateConversation(action.name);
      setLastCreated(action.id);
      toast({
        title: "Action Created",
        description: `Created "${action.name}"`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Unable to create action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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

  // Build sections for dropdown
  const actionSections: DropdownSection[] = [
    {
      title: "Quick Actions",
      items: quickActions.map((action): DropdownItem => ({
        id: action.id,
        isActive: lastCreated === action.id,
        isDisabled: isCreating,
        onSelect: () => handleQuickAction(action.id),
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5">
              <Plus className="w-4 h-4 text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{action.name}</span>
                {isCreating && lastCreated === action.id && (
                  <span className="text-xs bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full">
                    Creating...
                  </span>
                )}
                {!isCreating && lastCreated === action.id && (
                  <span className="text-xs text-white/50">
                    <Clock className="w-3 h-3 inline-block mr-0.5" />
                    Recent
                  </span>
                )}
              </div>
              <span className="text-xs text-white/60 line-clamp-1 w-full">
                {action.description}
              </span>
            </div>
          </div>
        )
      }))
    }
  ];

  // Define footer actions
  const footerActions: DropdownFooterAction[] = [
    {
      icon: <Plus className="w-3.5 h-3.5" />,
      label: "Create custom action",
      onClick: () => handleClick()
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="transparent" 
          className="p-0 h-auto rounded-sm transition-all duration-200 group w-full"
          aria-label="Quick actions menu"
        >
          <BaseTab
            icon={
              <div className="flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform duration-300">
                {isCreating ? 
                  <RefreshCw className="w-3 h-3 animate-spin" /> : 
                  <Plus className="w-3 h-3" />
                }
              </div>
            }
            label="Quick Actions"
            shortcut="Q"
            className="w-full"
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownList 
        sections={actionSections}
        footerActions={footerActions}
        emptyState={<div className="text-sm text-white/50">No quick actions available</div>}
      />
    </DropdownMenu>
  );
} 