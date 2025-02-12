import { Space } from "@/types";
import { ModelTab } from "./ui/model-tab";
import { SpaceTab } from "./ui/space-tab";
import QuickActionsTab from "./ui/quick-actions-tab";

export const Tabs = () => {
    return (
            <div className="flex items-center gap-2">
                <SpaceTab />
                <QuickActionsTab />
                <ModelTab />  
            </div>
    );
};
