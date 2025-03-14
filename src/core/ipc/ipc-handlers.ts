import { registerAuthHandlers } from './handlers/auth-handlers';
import { registerMessageHandlers } from './handlers/message-handlers';
import { registerSpaceHandlers } from './handlers/space-handlers';
import { registerAppStateHandlers } from './handlers/app-state-handlers';
import { registerConversationHandlers } from './handlers/conversation-handlers';
import { registerCommandCenterHandlers } from './handlers/command-center-handlers';

/**
 * Register all IPC handlers for the application
 */
export function registerIpcHandlers(): void {
  // Register all handler modules
  registerAuthHandlers();
  registerMessageHandlers();
  registerSpaceHandlers();
  registerAppStateHandlers();
  registerConversationHandlers();
  registerCommandCenterHandlers();
}