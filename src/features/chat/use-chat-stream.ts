import { useEffect, useState } from 'react';
import { Message } from '@/entities/message/model/types';
import { ChatEvents } from '@/core/ipc/constants';
import { IpcResponse } from '@/shared/types/ipc';
import { Logger } from '@/shared/lib/logger';
import { useToast } from '@/shared/hooks/use-toast';

const logger = new Logger('useChatStream');

type StreamChunkData = { chunk: string; messageId?: string };

interface UseChatStreamProps {
  activeConversationId?: string;
}

export const useChatStream = ({ activeConversationId }: UseChatStreamProps) => {
  const { toast } = useToast();
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [chatStatus, setChatStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    logger.debug('Setting up chat stream listeners for conversation:', { activeConversationId });
    setStreamingMessage(null);
    setIsStreamComplete(false);
    setChatStatus('idle'); 
    setErrorMessage(null);

    const cleanupChunk = window.electron.on(ChatEvents.CHAT_STREAM_CHUNK, (_event: Electron.IpcRendererEvent, response: IpcResponse<StreamChunkData>) => {
       if (response.success && response.data) {
          const { chunk, messageId } = response.data;
          setStreamingMessage((prev: Message | null): Message => {
            const now = new Date().toISOString();
            const baseMessage = prev || {
              id: messageId || `streaming_${Date.now()}`,
              role: 'assistant' as const,
              content: '',
              created_at: now,
              updated_at: now,
              conversation_id: activeConversationId || '',
              user_id: 'assistant_id',
              is_deleted: false,
              annotations: [],
            };
            return {
              ...baseMessage,
              content: baseMessage.content + chunk,
              updated_at: now,
            };
          });
          setIsStreamComplete(false);
          setChatStatus('loading'); 
          setErrorMessage(null);
       } else if (!response.success) {
         logger.warn('[ChatStream] Received unsuccessful CHUNK event', { error: response.error });
       }
    });

    const cleanupFinish = window.electron.on(ChatEvents.CHAT_STREAM_FINISH, (_event: Electron.IpcRendererEvent, response: IpcResponse) => {
       if (response.success) {
          logger.debug('[ChatStream] Stream finished event received');
          // Don't clear streaming message immediately to prevent flashing
          // setStreamingMessage(null);
          setIsStreamComplete(true);
          setChatStatus('idle');
       }
    });

    const cleanupError = window.electron.on(ChatEvents.CHAT_STREAM_ERROR, (_event: Electron.IpcRendererEvent, response: IpcResponse) => {
       if (!response.success) {
          const error = response.error || 'Unknown stream error';
          logger.error('[ChatStream] Stream error event received:', { error });
          setErrorMessage(error);
          setChatStatus('error');
          setStreamingMessage(null);
          setIsStreamComplete(false);
          toast({
            title: 'Chat Error',
            description: error,
            variant: 'destructive',
          });
       }
    });

    return () => {
      logger.debug('Cleaning up chat stream listeners for conversation:', { activeConversationId });
      cleanupChunk(); 
      cleanupFinish();
      cleanupError();
    };
  }, [toast, activeConversationId]);

  return {
    streamingMessage,
    isStreamComplete,
    chatStatus,
    errorMessage,
    setChatStatus, 
    setErrorMessage,
    setStreamingMessage,
    setIsStreamComplete,
  };
}; 