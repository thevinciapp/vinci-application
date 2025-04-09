import { useState } from 'react';
import { 
  Plus, RefreshCw, FileText, List, Download, 
  Clock, ArrowUpRight, Tag, FileCode, CheckSquare, 
  CalendarIcon, Mail, Share2, BookmarkIcon
} from 'lucide-react';
import { BaseTab } from 'shared/components/base-tab';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from 'shared/components/dropdown-menu';
import { Button } from 'shared/components/button';
import { toast } from 'shared/hooks/use-toast';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from 'shared/components/shared/dropdown-list';

export interface ActionsTabProps {
  onCreateConversation?: (title: string) => Promise<void>;
  onClick?: () => void;
}

export function ActionsTab({ onCreateConversation, onClick }: ActionsTabProps) {
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
    
    const action = quickActions.find(a => a.id === actionId);
    if (!action) return;
    
    setIsCreating(true);
    try {
      await onCreateConversation(action.name);
      setLastCreated(action.id);
      
      toast({
        title: "Action Created",
        description: `Created "${action.name}" action`,
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
      id: 'summarize',
      name: 'Summarize Conversation',
      description: 'Generate a concise summary of the current conversation',
      category: 'conversation'
    },
    {
      id: 'extract-action-items',
      name: 'Extract Action Items',
      description: 'Identify and list all action items discussed in the conversation',
      category: 'conversation'
    },
    {
      id: 'meeting-notes',
      name: 'Generate Meeting Notes',
      description: 'Create structured meeting notes from this conversation',
      category: 'conversation'
    },
    {
      id: 'export',
      name: 'Export Conversation',
      description: 'Export this conversation as Markdown, PDF, or text file',
      category: 'utility'
    },
    {
      id: 'bookmark',
      name: 'Add Bookmark',
      description: 'Bookmark this conversation at the current point',
      category: 'utility'
    },
    {
      id: 'generate-code',
      name: 'Generate Code',
      description: 'Create code based on the requirements in this conversation',
      category: 'content'
    },
    {
      id: 'create-draft',
      name: 'Draft Email',
      description: 'Create an email draft based on points discussed',
      category: 'content'
    },
    {
      id: 'create-event',
      name: 'Schedule Event',
      description: 'Create calendar event from details in conversation',
      category: 'content'
    },
    {
      id: 'share-conversation',
      name: 'Share Conversation',
      description: 'Generate a shareable link to this conversation',
      category: 'utility'
    }
  ];

  // Group actions by category
  const conversationActions = quickActions.filter(action => action.category === 'conversation');
  const contentActions = quickActions.filter(action => action.category === 'content');
  const utilityActions = quickActions.filter(action => action.category === 'utility');

  // Get icon based on action id
  const getActionIcon = (actionId: string) => {
    switch (actionId) {
      case 'summarize':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'extract-action-items':
        return <CheckSquare className="w-4 h-4 text-green-400" />;
      case 'meeting-notes':
        return <List className="w-4 h-4 text-purple-400" />;
      case 'export':
        return <Download className="w-4 h-4 text-teal-400" />;
      case 'bookmark':
        return <BookmarkIcon className="w-4 h-4 text-orange-400" />;
      case 'generate-code':
        return <FileCode className="w-4 h-4 text-cyan-400" />;
      case 'create-draft':
        return <Mail className="w-4 h-4 text-indigo-400" />;
      case 'create-event':
        return <CalendarIcon className="w-4 h-4 text-rose-400" />;
      case 'share-conversation':
        return <Share2 className="w-4 h-4 text-amber-400" />;
      default:
        return <Plus className="w-4 h-4 text-white/60" />;
    }
  };

  // Build sections for dropdown
  const buildSections = () => {
    const sections: DropdownSection[] = [];

    if (conversationActions.length > 0) {
      sections.push({
        title: "Conversation Actions",
        items: conversationActions.map(action => createActionItem(action))
      });
    }

    if (contentActions.length > 0) {
      sections.push({
        title: "Content Generation",
        items: contentActions.map(action => createActionItem(action))
      });
    }

    if (utilityActions.length > 0) {
      sections.push({
        title: "Utilities",
        items: utilityActions.map(action => createActionItem(action))
      });
    }

    return sections;
  };

  const createActionItem = (action: any): DropdownItem => ({
    id: action.id,
    isActive: lastCreated === action.id,
    isDisabled: isCreating,
    onSelect: () => handleQuickAction(action.id),
    content: (
      <div className="flex w-full">
        <div className="flex-shrink-0 mr-2.5 mt-0.5">
          {getActionIcon(action.id)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-sm font-medium text-white/90 truncate">{action.name}</span>
            {isCreating && lastCreated === action.id && (
              <span className="text-xs bg-white/10 text-white/80 px-1.5 py-0.5 rounded-full">
                Processing...
              </span>
            )}
          </div>
          <span className="text-xs text-white/60 line-clamp-2 w-full">
            {action.description}
          </span>
        </div>
      </div>
    )
  });

  const actionSections = buildSections();

  // Get footer actions based on selected action
  const getFooterActions = (): DropdownFooterAction[] => {
    // If an action is selected, show action-specific options
    if (lastCreated) {
      const selectedAction = quickActions.find(a => a.id === lastCreated);
      if (selectedAction) {
        return [
          {
            icon: <ArrowUpRight className="w-3.5 h-3.5" />,
            label: `Execute "${selectedAction.name}"`,
            onClick: () => handleQuickAction(lastCreated)
          },
          {
            icon: <Tag className="w-3.5 h-3.5" />,
            label: "Save as template",
            onClick: () => {
              toast({
                title: "Template Saved",
                description: `Saved "${selectedAction.name}" as template`,
                variant: "default",
              });
            }
          }
        ];
      }
    }
    
    // Default action when no action is selected
    return [
      {
        icon: <Plus className="w-3.5 h-3.5" />,
        label: "Create custom action",
        onClick: () => handleClick()
      }
    ];
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="transparent" 
          className="p-0 h-auto rounded-sm transition-all duration-200 group w-full"
          aria-label="Actions menu"
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
            label="Actions"
            shortcut="A"
            className="w-full"
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownList 
        sections={actionSections}
        footerActions={getFooterActions()}
        emptyState={<div className="text-sm text-white/50">No actions available</div>}
      />
    </DropdownMenu>
  );
} 