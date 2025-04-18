import { ArrowDown } from 'lucide-react';
import { BaseTab } from '@/shared/components/base-tab';
import { Space } from '@/entities/space/model/types';
import { ChatModeTab } from '@/features/chat/ui/chat-mode-tab';
import { ModelTab } from '@/features/chat/ui/model-tab';
import { SpaceTab } from '@/features/chat/ui/space-tab';

interface ChatTopBarProps {
  activeSpace: Space | null;
  spaces: Space[];
  setActiveSpaceById: (id: string) => Promise<void>;
  isStickToBottom: boolean;
  messagesLength: number;
  onScrollToBottom: () => void;
}

export function ChatTopBar({
  activeSpace,
  spaces,
  setActiveSpaceById,
  isStickToBottom,
  messagesLength,
  onScrollToBottom
}: ChatTopBarProps) {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
      </div>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="relative p-1 rounded-full command-glass-effect">
          <div className="flex items-center divide-x divide-white/[0.08]">
            <div className="px-1 first:pl-1 last:pr-1">
              <SpaceTab
                activeSpace={activeSpace}
                spaces={spaces}
                setActiveSpaceById={setActiveSpaceById}
              />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ModelTab space={activeSpace} />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ChatModeTab space={activeSpace} />
            </div>
            {!isStickToBottom && messagesLength > 0 && (
              <div className="px-1 first:pl-1 last:pr-1">
                <BaseTab
                  icon={<ArrowDown className="w-3 h-3" />}
                  label="Scroll to Bottom"
                  onClick={onScrollToBottom}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 