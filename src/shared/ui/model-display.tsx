import { ProviderIcon } from "@/features/chat/ui/provider-icon";
import { ModelDisplayInfo } from "@/entities/model/model/types";

interface ModelDisplayProps {
  modelInfo: ModelDisplayInfo;
  showDescription?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function ModelDisplay({ modelInfo, showDescription = false, showIcon = true, className = "" }: ModelDisplayProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showIcon && (
        <div className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-linear-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
          <ProviderIcon provider={modelInfo.provider} size={14} />
        </div>
      )}
      <div className="px-2.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-linear-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
        <span className="text-white">{modelInfo.displayName}</span>
      </div>
      {showDescription && modelInfo.description && (
        <span className="text-[10px] text-white/60">{modelInfo.description}</span>
      )}
    </div>
  );
} 