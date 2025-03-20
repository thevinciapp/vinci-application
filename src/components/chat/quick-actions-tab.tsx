import { Plus, Loader2, Bell } from 'lucide-react';
import { BaseTab } from 'vinci-ui';

interface QuickActionsTabProps {
  onCreateConversation?: (title: string) => Promise<void>;
}

export function QuickActionsTab({ onCreateConversation }: QuickActionsTabProps) {
  const handleClick = async () => {
    if (onCreateConversation) {
      await onCreateConversation('Quick Action');
    }
  };

  return (
    <BaseTab
      icon={<Plus className="w-3 h-3" />}
      label="Quick Actions"
      shortcut="Q"
      onClick={handleClick}
    />
  );
}

export function BackgroundTasksTab() {
  return (
    <BaseTab
      icon={<Loader2 className="w-3 h-3" />}
      label="Background Tasks"
      shortcut="B"
    />
  );
}

export function SuggestionsTab() {
  return (
    <BaseTab
      icon={<Bell className="w-3 h-3" />}
      label="Suggestions"
      shortcut="S"
    />
  );
}