import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/shared/hooks/use-toast';
import { Logger } from '@/shared/lib/logger';
import { ChatEvents } from '@/core/ipc/constants';
import { generateId as generateIdFunc, getMessageParts } from '@ai-sdk/ui-utils';
import type { JSONValue, ChatRequestOptions as VercelChatRequestOptions } from '@ai-sdk/ui-utils';
import type { VinciUIMessage } from '@/entities/message/model/types';
import type { VinciCreateMessage } from '@/features/message/create/model/types';
import { IpcResponse } from '@/shared/types/ipc';
import { FileReference } from '@/shared/types/ui';

const logger = new Logger('useChat');

export interface VinciChatRequestOptions extends Pick<VercelChatRequestOptions, 'headers' | 'body' | 'data'> {
  conversationId?: string;
  spaceId?: string;
  provider?: string;
  model?: string;
  files?: FileReference[];
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
    const handleChunk = (_event: Electron.IpcRendererEvent, response: IpcResponse<{ chunk: string; messageId?: string; fullMessage?: VinciUIMessage; isFirstChunk?: boolean; }>) => {
        logger.debug('[IPC Chat] Received CHUNK', response);
        if (!response.success || !response.data?.chunk) {
             logger.warn('[IPC Chat] Received unsuccessful or empty CHUNK event', { response });
             return;
        }

        const { chunk, messageId, fullMessage, isFirstChunk } = response.data;

        if (!currentStreamingMessageIdRef.current || isFirstChunk) {
            const newStreamId = messageId || `streaming_${generateId()}`;
            currentStreamingMessageIdRef.current = newStreamId;
            logger.debug(`[IPC Chat] Starting new stream with ID: ${newStreamId} (received ID: ${messageId})`);

            const newAssistantMessage: VinciUIMessage = {
                id: newStreamId,
                role: 'assistant',
                content: chunk,
                createdAt: new Date(),
                conversation_id: conversationIdRef.current || 'unknown_conv',
                parts: getMessageParts({ role: 'assistant', content: chunk }),
                ...(fullMessage ? fullMessage : {}),
             };
             
             // First make sure we don't have any duplicate streaming messages
             setMessagesState((prev) => {
                const existingStreamingMsg = prev.find(msg => 
                    msg.role === 'assistant' && msg.id.includes('streaming_'));
                
                if (existingStreamingMsg) {
                    // Replace the existing streaming message
                    return prev.map(msg => 
                        msg.id === existingStreamingMsg.id ? newAssistantMessage : msg);
                } else {
                    // Add a new message
                    return [...prev, newAssistantMessage];
                }
             });
             
             setStatus('streaming');
             setError(undefined);
        } else { 
            if (messageId && messageId !== currentStreamingMessageIdRef.current) {
                logger.warn('[IPC Chat] Received chunk with unexpected messageId during active stream', {
                    receivedId: messageId,
                    currentStreamId: currentStreamingMessageIdRef.current,
                });
            }

            setMessagesState((prev) => {
                const streamingMsg = prev.find(msg => msg.id === currentStreamingMessageIdRef.current);
                if (!streamingMsg) {
                    // If we somehow lost our streaming message, create a new one
                    logger.warn('[IPC Chat] Streaming message not found in state, creating new one');
                    const newAssistantMessage: VinciUIMessage = {
                        id: currentStreamingMessageIdRef.current as string,
                        role: 'assistant',
                        content: chunk,
                        createdAt: new Date(),
                        conversation_id: conversationIdRef.current || 'unknown_conv',
                        parts: getMessageParts({ role: 'assistant', content: chunk }),
                    };
                    return [...prev, newAssistantMessage];
                }
                
                return prev.map((msg) =>
                    msg.id === currentStreamingMessageIdRef.current
                      ? { ...msg, content: msg.content + chunk, updated_at: new Date().toISOString() } 
                      : msg
                );
            });
            if (status !== 'streaming') setStatus('streaming');
            setError(undefined);
        }
    };

    const handleFinish = (_event: Electron.IpcRendererEvent, response: IpcResponse<{ finalMessage?: VinciUIMessage }>) => {
        logger.debug('[IPC Chat] Received FINISH', response);
        const finishedMessageId = currentStreamingMessageIdRef.current;
        
        if (response.success) {
            setStatus('ready');
            
            // If we have a finalMessage in the response, use it to update the current streaming message
            if (response.data?.finalMessage && finishedMessageId) {
                const finalMessageData = response.data.finalMessage;
                setMessagesState(prev => 
                    prev.map(msg => 
                        msg.id === finishedMessageId ? 
                        { 
                            ...msg, 
                            id: finalMessageData.id || msg.id,
                            content: finalMessageData.content || msg.content,
                            updated_at: new Date().toISOString(),
                            annotations: finalMessageData.annotations || msg.annotations,
                            parts: finalMessageData.parts || msg.parts
                        } : msg
                    )
                );
            }
            
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
            if (onErrorRef.current) onErrorRef.current(error); 
            toast({ title: 'Chat Error', description: errorMsg, variant: 'destructive' });
        }
        
        currentStreamingMessageIdRef.current = null; // Reset ref after processing
    };

    const handleError = (_event: Electron.IpcRendererEvent, response: IpcResponse) => {
        logger.debug('[IPC Chat] Received ERROR', response);
        
        // Extract error message with fallback
        const errorMsg = response.error || 'Failed to generate response. Please try again.';
        const errorDetails = response.data?.details || {};
        
        logger.error('[IPC Chat] Stream error event received:', { 
          error: errorMsg, 
          details: errorDetails 
        });
        
        // Show a toast notification for all errors - always display this for visibility
        toast({
            title: 'Error',
            description: getUserFriendlyErrorMessage(errorMsg),
            variant: 'destructive',
            duration: 6000, // Show for 6 seconds to ensure user sees it
        });
        
        // Handle the streaming message if it exists
        if (currentStreamingMessageIdRef.current) {
            setMessagesState(prev => {
                // Find any existing assistant messages already in the stream
                const lastUserMsgIndex = findLastIndex(prev, msg => msg.role === 'user');
                
                if (lastUserMsgIndex === -1) {
                    // No user message found, just clean up
                    return prev.filter(msg => msg.id !== currentStreamingMessageIdRef.current);
                }
                
                // Get assistant messages that were inserted after this user message
                const messagesAfterUser = prev.filter((msg, idx) => 
                    idx > lastUserMsgIndex && msg.role === 'assistant'
                );
                
                // If we have an existing streaming message
                if (messagesAfterUser.length > 0) {
                    // Replace the streaming message with a friendly error message
                    const errorMessage: VinciUIMessage = {
                        id: generateId(),
                        role: 'assistant',
                        content: "I'm sorry, I encountered an error while generating a response. Please try again.",
                        createdAt: new Date(),
                        conversation_id: conversationIdRef.current || 'unknown',
                        parts: getMessageParts({ 
                            role: 'assistant', 
                            content: "I'm sorry, I encountered an error while generating a response. Please try again." 
                        }),
                    };
                    
                    // Filter out all assistant messages after the user message, and add our error message
                    return [...prev.filter((msg, idx) => !(idx > lastUserMsgIndex && msg.role === 'assistant')), errorMessage];
                } else {
                    // Just add a friendly error message as the assistant
                    const errorMessage: VinciUIMessage = {
                        id: generateId(),
                        role: 'assistant',
                        content: "I'm sorry, I encountered an error while generating a response. Please try again.",
                        createdAt: new Date(),
                        conversation_id: conversationIdRef.current || 'unknown',
                        parts: getMessageParts({ 
                            role: 'assistant', 
                            content: "I'm sorry, I encountered an error while generating a response. Please try again." 
                        }),
                    };
                    
                    return [...prev.filter(msg => msg.id !== currentStreamingMessageIdRef.current), errorMessage];
                }
            });
        }
        
        // Update state to ready
        setStatus('ready'); 
        
        if (onErrorRef.current) {
            onErrorRef.current(new Error(errorMsg));
        }
        
        currentStreamingMessageIdRef.current = null;
    };
    
    // Helper to find the last index of an item in array matching a predicate
    function findLastIndex<T>(array: T[], predicate: (item: T) => boolean): number {
        for (let i = array.length - 1; i >= 0; i--) {
            if (predicate(array[i])) return i;
        }
        return -1;
    }
    
    // Convert technical error messages to user-friendly versions
    function getUserFriendlyErrorMessage(errorMsg: string): string {
        // Truncate very long messages
        if (errorMsg.length > 100) {
            errorMsg = errorMsg.substring(0, 97) + '...';
        }
        
        // Replace known error patterns with user-friendly messages
        if (errorMsg.includes('timed out') || errorMsg.includes('timeout')) {
            return 'Request timed out. The service might be busy. Please try again.';
        } else if (errorMsg.includes('API error')) {
            return 'Service communication error. Please try again later.';
        } else if (errorMsg.includes('status 4')) {
            return 'Error connecting to the AI service. Please try again later.';
        }
        
        return errorMsg;
    }

    // Handle stream status updates (initiated, streaming, cancelled, etc.)
    const handleStatus = (_event: Electron.IpcRendererEvent, response: IpcResponse<{ 
      status: 'initiated' | 'streaming' | 'completed' | 'cancelled';
      conversationId: string;
    }>) => {
      logger.debug('[IPC Chat] Received STREAM_STATUS', response);
      if (!response.success || !response.data) return;
      
      const { status: streamStatus, conversationId } = response.data;
      
      // Only process if it's for our current conversation
      if (conversationId !== conversationIdRef.current) {
        logger.debug(`Ignoring status update for different conversation: ${conversationId}`);
        return;
      }
      
      logger.info(`Stream status update: ${streamStatus}`);
      
      switch (streamStatus) {
        case 'initiated':
          setStatus('submitted');
          setError(undefined);
          break;
        case 'streaming':
          setStatus('streaming');
          setError(undefined);
          break;
        case 'completed':
          setStatus('ready');
          break;
        case 'cancelled':
          setStatus('ready');
          // Handle the streaming message if it exists when cancelled
          if (currentStreamingMessageIdRef.current) {
            setMessagesState(prev => {
              // Find any existing assistant messages already in the stream
              const lastUserMsgIndex = findLastIndex(prev, msg => msg.role === 'user');
              
              if (lastUserMsgIndex === -1) {
                // No user message found, just clean up
                return prev.filter(msg => msg.id !== currentStreamingMessageIdRef.current);
              }
              
              // Get the streaming message
              const streamingMsg = prev.find(msg => msg.id === currentStreamingMessageIdRef.current);
              
              if (!streamingMsg) return prev;
              
              const content = streamingMsg.content?.trim() || '';
              const hasSignificantContent = content.length > 50; // Only keep messages with substantial content
              
              if (hasSignificantContent) {
                // Message has reasonable content - keep it with cancellation indicator
                return prev.map(msg => 
                  msg.id === currentStreamingMessageIdRef.current ? 
                  { ...msg, content: msg.content + "\n\n[Generation stopped by user]" } : msg
                );
              } else {
                // For short or empty messages, replace with brief acknowledgement
                // Create a new message instead of modifying the existing one
                const cancelMessage: VinciUIMessage = {
                  id: generateId(),
                  role: 'assistant',
                  content: "Response generation was cancelled.",
                  createdAt: new Date(),
                  conversation_id: conversationIdRef.current || 'unknown',
                  parts: getMessageParts({ 
                    role: 'assistant', 
                    content: "Response generation was cancelled." 
                  }),
                };
                
                // Replace the streaming message with our cancel message
                return [...prev.filter(msg => msg.id !== currentStreamingMessageIdRef.current), cancelMessage];
              }
            });
            currentStreamingMessageIdRef.current = null;
          }
          break;
      }
    };
    
    logger.debug('Setting up chat IPC listeners');
    setStatus('ready');
    setError(undefined);
    currentStreamingMessageIdRef.current = null; // Initial reset

    const cleanupChunk = window.electron.on(ChatEvents.CHAT_STREAM_CHUNK, handleChunk);
    const cleanupFinish = window.electron.on(ChatEvents.CHAT_STREAM_FINISH, handleFinish);
    const cleanupError = window.electron.on(ChatEvents.CHAT_STREAM_ERROR, handleError);
    const cleanupStatus = window.electron.on(ChatEvents.CHAT_STREAM_STATUS, handleStatus);

    return () => {
      logger.debug('Cleaning up chat IPC listeners');
      cleanupChunk();
      cleanupFinish();
      cleanupError();
      cleanupStatus();
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

      } catch (err: Error) {
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


  const stop = useCallback(async () => {
    logger.info('Stopping chat stream');
    const currentConversationId = conversationIdRef.current;
    
    if (!currentConversationId) {
      logger.warn('Cannot stop stream: No active conversation ID');
      return;
    }
    
    if (status === 'streaming' || status === 'submitted') {
      try {
        logger.debug(`Sending cancel request for conversation ${currentConversationId}`);
        
        const response: IpcResponse = await window.electron.invoke(
          ChatEvents.CANCEL_CHAT_STREAM, 
          currentConversationId
        );
        
        logger.debug('Cancel response:', response);
        
        if (!response.success) {
          logger.warn(`Failed to cancel stream: ${response.error}`);
          toast({
            title: 'Warning',
            description: 'Failed to cancel generation. Please wait for it to complete.',
            variant: 'destructive',
          });
        }
      } catch (err: Error) {
        logger.error('Error cancelling stream:', err);
        toast({
          title: 'Error',
          description: 'There was a problem cancelling the response generation.',
          variant: 'destructive',
        });
      } finally {
        // Update local state regardless of cancellation result
        setStatus('ready');
        
        // Note: We don't need to handle the streaming message here anymore,
        // as it's properly handled by the CHAT_STREAM_STATUS event with 'cancelled' status
        // Simply clean up the reference
        currentStreamingMessageIdRef.current = null;
      }
    }
  }, [status, toast]);


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