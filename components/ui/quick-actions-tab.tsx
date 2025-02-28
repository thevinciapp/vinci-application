import { Sparkles } from "lucide-react";
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