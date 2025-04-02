import { registerAuthHandlers } from '@/core/ipc/handlers/auth-handlers';
import { registerMessageHandlers } from '@/core/ipc/handlers/message-handlers';
import { registerSpaceHandlers } from '@/core/ipc/handlers/space-handlers';
import { registerAppStateHandlers } from '@/core/ipc/handlers/app-state-handlers';
import { registerCommandCenterHandlers } from '@/core/ipc/handlers/command-center-handlers';
import { registerConversationHandlers } from '@/core/ipc/handlers/conversation-handlers';
import { registerUserHandlers } from '@/core/ipc/handlers/user-handlers';
import { registerNotificationHandlers } from '@/core/ipc/handlers/notification-handlers';
import { registerChatHandlers } from '@/core/ipc/handlers/chat-handlers-register';

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