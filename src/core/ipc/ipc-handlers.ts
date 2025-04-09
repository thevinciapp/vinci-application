import { registerAuthHandlers } from '@/core/ipc/handlers/auth';
import { registerMessageHandlers } from '@/core/ipc/handlers/message';
import { registerSpaceHandlers } from '@/core/ipc/handlers/space';
import { registerAppStateHandlers } from '@/core/ipc/handlers/app-state';
import { registerCommandCenterHandlers } from '@/core/ipc/handlers/command-center';
import { registerConversationHandlers } from '@/core/ipc/handlers/conversation';
import { registerUserHandlers } from '@/core/ipc/handlers/user';
import { registerNotificationHandlers } from '@/core/ipc/handlers/notification';
import { registerChatHandlers } from '@/core/ipc/handlers/chat';

export function registerIpcHandlers(): void {
  registerAuthHandlers();
  registerMessageHandlers();
  registerSpaceHandlers();
  registerAppStateHandlers();
  registerCommandCenterHandlers();
  registerConversationHandlers();
  registerUserHandlers();
  registerNotificationHandlers();
  registerChatHandlers();
}