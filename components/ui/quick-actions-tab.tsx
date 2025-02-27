import { Sparkles } from "lucide-react";
import { BaseTab } from "./common/base-tab";

export default function QuickActionsTab() {
    return (
        <BaseTab
            icon={<Sparkles className="w-3 h-3" />}
            label="Quick Actions"
            shortcut="K"
            minWidth="actions"
        />
    );
}