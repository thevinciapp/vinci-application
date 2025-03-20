import { Plus, Loader2, Bell } from 'lucide-react';
import { BaseTab } from 'vinci-ui';

interface QuickActionsTabProps {
  onCreateConversation?: () => Promise<void>;
}

export function QuickActionsTab({ onCreateConversation }: QuickActionsTabProps) {
  return (
    <BaseTab
      icon={<Plus className="w-3 h-3" />}
      label="Quick Actions"
      shortcut="Q"
      onClick={onCreateConversation}
    />
  );
}

export function BackgroundTasksTab() {
  return (
    <BaseTab
      icon={<Loader2 className="w-3 h-3 animate-spin" />}
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