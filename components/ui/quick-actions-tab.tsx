import { Sparkles } from "lucide-react";
import { BaseTab } from "./base-tab";
import { useQuickActionsCommand } from "./quick-actions-command-provider";

export default function QuickActionsTab() {
    const { toggleQuickActionsCommand } = useQuickActionsCommand();

    return (
        <BaseTab
            icon={<Sparkles className="w-3 h-3" />}
            label="Quick Actions"
            shortcut="K"
            minWidth="actions"
            onClick={() => toggleQuickActionsCommand()}
        />
    );
}