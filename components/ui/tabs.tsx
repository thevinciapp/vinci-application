import { Space } from "@/types";
import { ModelTab } from "./model-tab";
import { SpaceTab } from "./space-tab";
import QuickActionsTab from "./quick-actions-tab";

export const Tabs = () => {
    return (
            <div className="flex items-center gap-2">
                <SpaceTab />
                <QuickActionsTab />
                <ModelTab />  
            </div>
    );
};
