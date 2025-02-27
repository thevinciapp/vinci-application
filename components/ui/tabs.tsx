import { ModelTab } from "@/components/ui/chat/model-tab";
import { SpaceTab } from "@/components/ui/space/space-tab";
import QuickActionsTab from "@/components/ui/quick-actions-tab";

export const Tabs = () => {
    return (
            <div className="flex items-center gap-2">
                <SpaceTab />
                <QuickActionsTab />
                <ModelTab />  
            </div>
    );
};
