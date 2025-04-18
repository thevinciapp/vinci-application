import { Logger } from '@/shared/lib/logger';
import { StreamControllerManager } from './types';

const logger = new Logger('StreamControllers');

export function createStreamControllerManager(): StreamControllerManager {
  const activeStreamControllers = new Map<string, AbortController>();
  
  /**
   * Registers an AbortController for a stream
   */
  function register(conversationId: string, controller: AbortController): void {
    logger.debug(`Registering stream controller for conversation ${conversationId}`);
    
    // Cancel any existing stream for this conversation
    if (activeStreamControllers.has(conversationId)) {
      logger.debug(`Cancelling previous stream for conversation ${conversationId}`);
      try {
        activeStreamControllers.get(conversationId)?.abort();
      } catch (e) {
        logger.error(`Error aborting previous stream: ${e}`);
      }
    }
    
    activeStreamControllers.set(conversationId, controller);
  }
  
  /**
   * Cleans up an AbortController when a stream ends
   */
  function cleanup(conversationId: string): void {
    logger.debug(`Cleaning up stream controller for conversation ${conversationId}`);
    activeStreamControllers.delete(conversationId);
  }
  
  /**
   * Gets an AbortController for a conversation
   */
  function get(conversationId: string): AbortController | undefined {
    return activeStreamControllers.get(conversationId);
  }
  
  /**
   * Checks if a controller exists for a conversation
   */
  function has(conversationId: string): boolean {
    return activeStreamControllers.has(conversationId);
  }
  
  return {
    register,
    cleanup,
    get,
    has
  };
}