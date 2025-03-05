import { Sparkles, Timer, Lightbulb } from "lucide-react";
import { BaseTab } from "./common/base-tab";
import { useCommandCenter } from "@/hooks/useCommandCenter";

// Original component that uses hooks
export default function QuickActionsTab() {
    const { toggleCommandCenter } = useCommandCenter();
    
    return (
        <BaseTab
            icon={<Sparkles className="w-3 h-3" />}
            label="Quick Actions"
            shortcut="K"
            minWidth="actions"
            commandType="application"
            onClick={() => {
                toggleCommandCenter();
            }}
        />
    );
}

// Server-driven version that accepts props
export function ServerDrivenQuickActionsTab({ 
    onCreateConversation 
}: { 
    onCreateConversation: (title: string) => Promise<void> 
}) {
    const { toggleCommandCenter } = useCommandCenter();
    
    return (
        <BaseTab
            icon={<Sparkles className="w-3 h-3" />}
            label="Quick Actions"
            shortcut="K"
            minWidth="actions"
            commandType="application"
            onClick={() => {
                toggleCommandCenter();
            }}
        />
    );
}

// Background Tasks Tab
export function BackgroundTasksTab() {
    const { openCommandType } = useCommandCenter();
    
    return (
        <BaseTab
            icon={<Timer className="w-3 h-3" />}
            label="Background Tasks"
            shortcut="T"
            minWidth="actions"
            commandType="background-tasks"
            onClick={() => openCommandType("background-tasks")}
        />
    );
}

// Server-driven version for Background Tasks
export function ServerDrivenBackgroundTasksTab() {
    const { openCommandType } = useCommandCenter();
    
    return (
        <BaseTab
            icon={<Timer className="w-3 h-3" />}
            label="Background Tasks"
            shortcut="T"
            minWidth="actions"
            commandType="background-tasks"
            onClick={() => openCommandType("background-tasks")}
        />
    );
}

// Suggestions Tab
export function SuggestionsTab() {
    const { openCommandType } = useCommandCenter();
    
    return (
        <BaseTab
            icon={<Lightbulb className="w-3 h-3" />}
            label="Suggestions"
            shortcut="G"
            minWidth="actions"
            commandType="suggestions"
            onClick={() => openCommandType("suggestions")}
        />
    );
}

// Server-driven version for Suggestions
export function ServerDrivenSuggestionsTab() {
    const { openCommandType } = useCommandCenter();
    
    return (
        <BaseTab
            icon={<Lightbulb className="w-3 h-3" />}
            label="Suggestions"
            shortcut="G"
            minWidth="actions"
            commandType="suggestions"
            onClick={() => openCommandType("suggestions")}
        />
    );
}