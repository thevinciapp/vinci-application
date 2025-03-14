import { Sparkles, Timer, Lightbulb } from "lucide-react";
import { BaseTab } from "vinci-ui";

export function ServerDrivenQuickActionsTab({ 
    onCreateConversation 
}: { 
    onCreateConversation: (title: string) => Promise<void> 
}) {
    return (
        <BaseTab
            icon={<Sparkles className="w-3 h-3" />}
            label="Quick Actions"
            shortcut="K"
            minWidth="actions"
            commandType="application"
        />
    );
}

export function ServerDrivenBackgroundTasksTab() {
    return (
        <BaseTab
            icon={<Timer className="w-3 h-3" />}
            label="Background Tasks"
            shortcut="T"
            minWidth="actions"
            commandType="background-tasks"
        />
    );
}

export function ServerDrivenSuggestionsTab() {
    return (
        <BaseTab
            icon={<Lightbulb className="w-3 h-3" />}
            label="Suggestions"
            shortcut="G"
            minWidth="actions"
            commandType="suggestions"
        />
    );
}