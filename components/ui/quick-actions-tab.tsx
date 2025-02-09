import { Sparkles } from "lucide-react";
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';

export default function QuickActionsTab() {
    const { openQuickActionsCommand } = useQuickActionsCommand();

    return (
        <button
            onClick={() => openQuickActionsCommand(false)}
            className="px-3 py-1 rounded-t-lg backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden
              before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10
              hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
            <Sparkles className="w-3 h-3" />
            Quick Actions
            <span className="text-white/60 text-[10px]">⌘K</span>
        </button>
    );
}