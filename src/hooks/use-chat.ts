import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Logger } from '@/utils/logger';
import { ChatEvents } from '@/core/ipc/constants';
import { generateId as generateIdFunc, getMessageParts } from '@ai-sdk/ui-utils';
import type { JSONValue, ChatRequestOptions as VercelChatRequestOptions } from '@ai-sdk/ui-utils';
import type { VinciUIMessage, VinciCreateMessage, MessageResponse, Message as VinciHandlerMessage, MessageAnnotation } from '@/types/message';
import { IpcResponse } from '@/types/ipc';

const logger = new Logger('useChat');

export interface VinciChatRequestOptions extends Pick<VercelChatRequestOptions, 'headers' | 'body' | 'data'> {
  conversationId?: string;
  spaceId?: string;
  provider?: string;
  model?: string;
  files?: any;
  searchMode?: string;
  chatMode?: string;
}

export interface UseChatOptions {
  initialMessages?: VinciUIMessage[];
  initialInput?: string;
  id?: string;
  spaceId?: string;
  generateId?: () => string;
  onFinish?: (message: VinciUIMessage) => void;
  onError?: (error: Error) => void;
}

export type UseChatHelpers = {
  messages: VinciUIMessage[];
  error: undefined | Error;
  append: (
    message: VinciUIMessage | VinciCreateMessage,
    chatRequestOptions?: VinciChatRequestOptions,
  ) => Promise<void>;
  reload: (
    chatRequestOptions?: VinciChatRequestOptions,
  ) => Promise<void>;
  stop: () => void;
  setMessages: (messages: VinciUIMessage[]) => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  handleSubmit: (
    event?: React.FormEvent<HTMLFormElement>,
    chatRequestOptions?: VinciChatRequestOptions,
  ) => void;
  isLoading: boolean;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  data?: JSONValue[];
  setData: (data: JSONValue[] | undefined | ((data: JSONValue[] | undefined) => JSONValue[] | undefined)) => void;
  conversationId: string | undefined;
  spaceId: string | undefined;
};

export function useChat({
  initialMessages,
  initialInput = '',
  id: initialConversationId,
  spaceId: initialSpaceId,
  generateId = generateIdFunc,
  onFinish,
  onError,
}: UseChatOptions = {}): UseChatHelpers {
  const { toast } = useToast();
  const [messages, setMessagesState] = useState<VinciUIMessage[]>([]);
  const [input, setInput] = useState(initialInput);
  const [status, setStatus] = useState<'submitted' | 'streaming' | 'ready' | 'error'>('ready');
  const [error, setError] = useState<Error | undefined>(undefined);
  const [data, setDataState] = useState<JSONValue[] | undefined>(undefined);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [spaceId, setSpaceId] = useState<string | undefined>(initialSpaceId);

  const messagesRef = useRef(messages);
  const conversationIdRef = useRef(conversationId);
  const spaceIdRef = useRef(spaceId);
  const currentStreamingMessageIdRef = useRef<string | null>(null);

  const onFinishRef = useRef(onFinish);
  const onErrorRef = useRef(onError);


  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Effect to handle initial messages when they change
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      logger.debug(`Setting initial messages (${initialMessages.length}) for conversation ${initialConversationId}`);
      setMessagesState(initialMessages);
    }
  }, [initialMessages, initialConversationId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    if (initialConversationId && conversationId !== initialConversationId) {
        setConversationId(initialConversationId);
    }
  }, [conversationId, initialConversationId]);

  useEffect(() => {
    spaceIdRef.current = spaceId;
     if (initialSpaceId && spaceId !== initialSpaceId) {
        setSpaceId(initialSpaceId);
     }
  }, [spaceId, initialSpaceId]);


  const setMessages = useCallback((newMessages: VinciUIMessage[]) => {
    if (!newMessages) {
      logger.warn('setMessages called with null messages array');
      return;
    }
    
    // Even if empty array is passed, we should still set it 
    // to ensure messages clear properly when needed
    logger.debug(`Setting messages array with ${newMessages.length} items`);
    setMessagesState(newMessages);
  }, []);

  const setData = useCallback((newData: JSONValue[] | undefined | ((currentData: JSONValue[] | undefined) => JSONValue[] | undefined)) => {
     if (typeof newData === 'function') {
       setDataState(current => newData(current));
     } else {
       setDataState(newData);
     }
  }, []);

  useEffect(() => {
    const handleChunk = (_event: Electron.IpcRendererEvent, response: IpcResponse<{ chunk: string; messageId?: string }>) => {
        logger.debug('[IPC Chat] Received CHUNK', response);
        if (!response.success || !response.data?.chunk) {
             logger.warn('[IPC Chat] Received unsuccessful or empty CHUNK event', { response });
             return;
        }

        const { chunk, messageId } = response.data;

        // Use the current value of the ref for logic
        if (!currentStreamingMessageIdRef.current) {
            const newStreamId = messageId || `streaming_${generateId()}`;
            currentStreamingMessageIdRef.current = newStreamId; // Set the ref
            logger.debug(`[IPC Chat] Starting new stream with ID: ${newStreamId} (received ID: ${messageId})`);

            const newAssistantMessage: VinciUIMessage = {
                id: newStreamId,
                role: 'assistant',
                content: chunk,
                createdAt: new Date(),
                conversation_id: conversationIdRef.current || 'unknown_conv',
                parts: getMessageParts({ role: 'assistant', content: chunk }),
             };
             setMessagesState((prev) => [...prev, newAssistantMessage]);
             setStatus('streaming');
             setError(undefined);
        } else { // Ref already has an ID - stream is active
            if (messageId && messageId !== currentStreamingMessageIdRef.current) {
                logger.warn('[IPC Chat] Received chunk with unexpected messageId during active stream', {
                    receivedId: messageId,
                    currentStreamId: currentStreamingMessageIdRef.current,
                });
                // Potentially handle this case if needed, but continue appending for now
            }

            setMessagesState((prev) =>
                prev.map((msg) =>
                    msg.id === currentStreamingMessageIdRef.current // Compare with current ref value
                      ? { ...msg, content: msg.content + chunk, updated_at: new Date().toISOString() } 
                      : msg
                )
             );
            if (status !== 'streaming') setStatus('streaming');
            setError(undefined);
        }
    };

    const handleFinish = (_event: Electron.IpcRendererEvent, response: IpcResponse) => {
        logger.debug('[IPC Chat] Received FINISH', response);
        const finishedMessageId = currentStreamingMessageIdRef.current;
        currentStreamingMessageIdRef.current = null; // Reset ref

        if (response.success) {
            setStatus('ready');
            // Use ref to call the latest onFinish prop
            if (onFinishRef.current && finishedMessageId) { 
                const finalMessage = messagesRef.current.find(msg => msg.id === finishedMessageId);
                if (finalMessage) {
                    onFinishRef.current(finalMessage);
                }
            }
        } else {
            const errorMsg = response.error || 'Unknown stream finish error';
            logger.error('[IPC Chat] Received unsuccessful FINISH event', { error: errorMsg });
            const error = new Error(errorMsg);
            setError(error);
            setStatus('error');
            // Use ref to call the latest onError prop
            if (onErrorRef.current) onErrorRef.current(error); 
            toast({ title: 'Chat Error', description: errorMsg, variant: 'destructive' });
        }
    };

    const handleError = (_event: Electron.IpcRendererEvent, response: IpcResponse) => {
        logger.debug('[IPC Chat] Received ERROR', response);
        currentStreamingMessageIdRef.current = null; // Reset ref
        if (!response.success) {
            const errorMsg = response.error || 'Unknown stream error';
            logger.error('[IPC Chat] Stream error event received:', { error: errorMsg });
            const error = new Error(errorMsg)
            setError(error);
            setStatus('error');
            // Use ref to call the latest onError prop
            if (onErrorRef.current) onErrorRef.current(error); 
            toast({
                title: 'Chat Error',
                description: errorMsg,
                variant: 'destructive',
            });
        }
    };

    logger.debug('Setting up chat IPC listeners');
    setStatus('ready');
    setError(undefined);
    currentStreamingMessageIdRef.current = null; // Initial reset

    const cleanupChunk = window.electron.on(ChatEvents.CHAT_STREAM_CHUNK, handleChunk);
    const cleanupFinish = window.electron.on(ChatEvents.CHAT_STREAM_FINISH, handleFinish);
    const cleanupError = window.electron.on(ChatEvents.CHAT_STREAM_ERROR, handleError);

    return () => {
      logger.debug('Cleaning up chat IPC listeners');
      cleanupChunk();
      cleanupFinish();
      cleanupError();
      currentStreamingMessageIdRef.current = null; // Cleanup reset
    };
  }, [toast, generateId]);


  const triggerRequest = useCallback(async (messagesToSend: VinciUIMessage[], options?: VinciChatRequestOptions) => {
      const currentConvId = options?.conversationId || conversationIdRef.current;
      const currentSpaceId = options?.spaceId || spaceIdRef.current;

       if (!currentConvId) {
           const errorMsg = 'Cannot send message: Conversation ID is missing.';
           logger.error(errorMsg, { messagesToSend, options });
           const error = new Error(errorMsg); // Create error object
           setError(error);
           setStatus('error');
           // Use ref here
           if (onErrorRef.current) onErrorRef.current(error);
           toast({ title: 'Chat Error', description: errorMsg, variant: 'destructive' });
           return;
       }

       logger.debug('Triggering IPC chat request', { conversationId: currentConvId, spaceId: currentSpaceId, messageCount: messagesToSend.length });
       setStatus('submitted');
       setError(undefined);
       currentStreamingMessageIdRef.current = null;

      try {
        const messagesForHandler = messagesToSend;

        const payload = {
            conversationId: currentConvId,
            spaceId: currentSpaceId,
            messages: messagesForHandler,
            provider: options?.provider,
            model: options?.model,
            files: options?.files,
            searchMode: options?.searchMode,
            chatMode: options?.chatMode,
        };

        const response: IpcResponse = await window.electron.invoke(ChatEvents.INITIATE_CHAT_STREAM, payload);

        logger.debug('[IPC Chat] Send message response', response);

        if (!response.success && response.error) {
             throw new Error(response.error || 'Failed to initiate chat stream via IPC');
        }

      } catch (err: any) {
        logger.error('[IPC Chat] Error sending message or initiating stream:', err);
        setError(err);
        setStatus('error');
        // Use ref here
        if (onErrorRef.current) onErrorRef.current(err);
         toast({
            title: 'Chat Error',
            description: err.message || 'Failed to send message',
            variant: 'destructive',
          });
      }
  }, [toast]);


  const append = useCallback(async (
    message: VinciUIMessage | VinciCreateMessage,
    chatRequestOptions?: VinciChatRequestOptions,
  ) => {
      const currentConvId = chatRequestOptions?.conversationId || conversationIdRef.current;
      const currentSpaceId = chatRequestOptions?.spaceId || spaceIdRef.current;

       if (!currentConvId) {
            logger.error('Cannot append message: Conversation ID is missing.');
             toast({ title: 'Error', description: 'Conversation ID missing.', variant: 'destructive' });
            return;
       }

      const role = message.role || 'user';

      const newMessage: VinciUIMessage = {
          ...message,
          id: message.id ?? generateId(),
          createdAt: message.createdAt ?? new Date(),
          role: role,
          content: message.content || '',
          conversation_id: currentConvId,
          parts: getMessageParts({
             role: role,
              content: message.content || '',
              experimental_attachments: (message as VinciUIMessage).experimental_attachments
           }),
       };

      const newMessages = [...messagesRef.current, newMessage];
      setMessagesState(newMessages);

      await triggerRequest(newMessages, chatRequestOptions);

  }, [generateId, triggerRequest, toast]);

  const reload = useCallback(async (chatRequestOptions?: VinciChatRequestOptions) => {
      const currentMessages = messagesRef.current;
       if (currentMessages.length === 0) {
           logger.warn('Cannot reload: No messages exist.');
           return;
       }

       let messagesToReload = [...currentMessages];
       let lastAssistantMessageIndex = -1;
       for (let i = messagesToReload.length - 1; i >= 0; i--) {
           if (messagesToReload[i].role === 'assistant') {
               lastAssistantMessageIndex = i;
               break;
           }
       }

       if (lastAssistantMessageIndex === messagesToReload.length - 1) {
           messagesToReload = messagesToReload.slice(0, -1);
           setMessagesState(messagesToReload);
       }

       await triggerRequest(messagesToReload, chatRequestOptions);

  }, [triggerRequest]);


  const stop = useCallback(() => {
    logger.warn('stop() called, but IPC cancellation is not implemented.');
     if (status === 'streaming' || status === 'submitted') {
        setStatus('ready');
        currentStreamingMessageIdRef.current = null;
     }
  }, [status]);


  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);


  const handleSubmit = useCallback((event?: React.FormEvent<HTMLFormElement>, chatRequestOptions?: VinciChatRequestOptions) => {
    event?.preventDefault();
    if (!input.trim()) return;

    const messageToSend: VinciCreateMessage = {
        role: 'user',
        content: input,
        conversation_id: chatRequestOptions?.conversationId || conversationIdRef.current || '',
    };

    append(messageToSend, chatRequestOptions);
    setInput('');
  }, [input, append]);

  return {
    messages,
    error,
    append,
    reload,
    stop,
    setMessages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading: status === 'submitted' || status === 'streaming',
    status,
    data,
    setData,
    conversationId,
    spaceId,
  };
} 