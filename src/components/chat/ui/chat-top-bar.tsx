import { ArrowDown } from 'lucide-react';
import { UserProfileDropdown } from '@/components/auth/user-profile-dropdown';
import { SpaceTab } from '@/components/chat/ui/space-tab';
import { ModelTab } from '@/components/chat/ui/model-tab';
import { ChatModeTab } from '@/components/chat/ui/chat-mode-tab';
import { BaseTab } from '@/components/ui/base-tab';

interface ChatTopBarProps {
  user: any | null;
  activeSpace: any;
  isStickToBottom: boolean;
  messagesLength: number;
  onScrollToBottom: () => void;
}

export function ChatTopBar({
  user,
  activeSpace,
  isStickToBottom,
  messagesLength,
  onScrollToBottom
}: ChatTopBarProps) {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        {user && <UserProfileDropdown user={user} />}
      </div>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="relative p-1 rounded-full command-glass-effect">
          <div className="flex items-center divide-x divide-white/[0.08]">
            <div className="px-1 first:pl-1 last:pr-1">
              <SpaceTab activeSpace={activeSpace} />
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