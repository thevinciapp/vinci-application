import { Sparkles } from "lucide-react";
import { BaseTab } from "./common/base-tab";
import { useCommandCenter } from "@/hooks/useCommandCenter";

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