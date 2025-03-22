import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatEvents } from '@/core/ipc/constants';
import { v4 as uuidv4 } from 'uuid';

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt?: Date;
}

export interface ChatRequestOptions {
  body?: Record<string, any>;
  data?: any;
  allowEmptySubmit?: boolean;
}

export type UseChatOptions = {
  id?: string;
  initialMessages?: Message[];
  body?: Record<string, any>;
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
  onResponse?: (response: Response) => void;
};

type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';


export function useChatIpc({
  id,
  initialMessages = [],
  body = {},
  onFinish,
  onError,
}: UseChatOptions) {
  const chatId = id || uuidv4();
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState<string>('');
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    return () => {
      if (status === 'streaming') {
        window.electron.cancelChat(chatId);
      }
    };
  }, [chatId, status]);
  
  useEffect(() => {
    const onChatStreamStart = (_: any, data: any) => {
      if (data.chatId === chatId) {
        setStatus('streaming');
        setData([]);
      }
    };
    
    const onChatStreamChunk = (_: any, { chatId: eventChatId, chunk }: any) => {
      if (eventChatId === chatId && chunk) {
        setData((prevData) => [...prevData, chunk]);
      }
    };
    
    const onChatStreamFinish = (_: any, { chatId: eventChatId }: any) => {
      if (eventChatId === chatId) {
        setStatus('ready');
        
        setMessages((currentMessages) => {
          const lastMessage = currentMessages[currentMessages.length - 1];
          
          if (lastMessage && lastMessage.role === 'assistant') {
            const fullContent = data.reduce((acc, chunk) => {
              if (typeof chunk === 'string') return acc + chunk;
              if (chunk.text) return acc + chunk.text;
              if (chunk.content) return acc + chunk.content;
              return acc;
            }, '');
            
            const updatedMessage = {
              ...lastMessage,
              content: fullContent || lastMessage.content,
            };
            
            if (onFinish) {
              onFinish(updatedMessage);
            }
            
            return [
              ...currentMessages.slice(0, currentMessages.length - 1),
              updatedMessage,
            ];
          }
          
          return currentMessages;
        });
      }
    };
    
    const onChatStreamError = (_: any, { chatId: eventChatId, error: errorMessage }: any) => {
      if (eventChatId === chatId) {
        setStatus('error');
        const errorObj = new Error(errorMessage || 'Unknown error');
        setError(errorObj);
        
        if (onError) {
          onError(errorObj);
        }
      }
    };
    
    const removeStartListener = window.electron.on(ChatEvents.CHAT_STREAM_START, onChatStreamStart);
    const removeChunkListener = window.electron.on(ChatEvents.CHAT_STREAM_CHUNK, onChatStreamChunk);
    const removeFinishListener = window.electron.on(ChatEvents.CHAT_STREAM_FINISH, onChatStreamFinish);
    const removeErrorListener = window.electron.on(ChatEvents.CHAT_STREAM_ERROR, onChatStreamError);
    
    return () => {
      removeStartListener();
      removeChunkListener();
      removeFinishListener();
      removeErrorListener();
    };
  }, [chatId, data, onError, onFinish]);
  
  const handleSubmit = useCallback(
    async (
      e?: React.FormEvent<HTMLFormElement> | { preventDefault?: () => void },
      options: ChatRequestOptions = {}
    ) => {
      e?.preventDefault?.();
      
      if (!input.trim() && !options.allowEmptySubmit) {
        return;
      }
      
      const combinedBody = {
        ...body,
        ...(options.body || {}),
      };
      
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: input,
        createdAt: new Date(),
      };
      
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };
      
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      
      setInput('');
      
      setStatus('submitted');
      
      try {
        const currentMessages = [...messages, userMessage];
        
        const response = await window.electron.initiateChat(chatId, {
          ...combinedBody,
          messages: currentMessages,
          data: options.data,
        });
        
        if (!response.success) {
          const errorObj = new Error(response.error || 'Unknown error occurred');
          setStatus('error');
          setError(errorObj);
          
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [
                ...prevMessages.slice(0, prevMessages.length - 1),
                {
                  ...lastMessage,
                  content: `Error: ${response.error || 'An error occurred while processing your request'}`
                }
              ];
            }
            return prevMessages;
          });
          
          if (onError) {
            onError(errorObj);
          }
        }
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setStatus('error');
        setError(errorObj);
        
        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            return [
              ...prevMessages.slice(0, prevMessages.length - 1),
              {
                ...lastMessage,
                content: `Error: ${errorObj.message}`
              }
            ];
          }
          return prevMessages;
        });
        
        if (onError) {
          onError(errorObj);
        }
      }
    },
    [body, chatId, input, messages, onError]
  );
  
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement> | string) => {
      const value = typeof e === 'string' ? e : e.target.value;
      setInput(value);
    },
    []
  );
  
  const stop = useCallback(() => {
    if (status === 'streaming') {
      window.electron.cancelChat(chatId);
      setStatus('ready');
    }
  }, [chatId, status]);
  
  const append = useCallback(
    async (message: Message | { role: Role; content: string }, options: ChatRequestOptions = {}) => {
      const newMessage: Message = 'id' in message
        ? message as Message
        : {
            id: uuidv4(),
            role: message.role,
            content: message.content,
            createdAt: new Date(),
          };
      
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      
      if (newMessage.role === 'user') {
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: '',
          createdAt: new Date(),
        };
        
        setMessages((prevMessages) => [...prevMessages, assistantMessage]);
        
        setStatus('submitted');
        
        try {
          const currentMessages = [...messages, newMessage];
          
          const combinedBody = {
            ...body,
            ...(options.body || {}),
          };
          
          const response = await window.electron.initiateChat(chatId, {
            ...combinedBody,
            messages: currentMessages,
            data: options.data,
          });
          
          if (!response.success) {
            const errorObj = new Error(response.error || 'Unknown error occurred');
            setStatus('error');
            setError(errorObj);
            
            setMessages((prevMessages) => {
              const lastMessage = prevMessages[prevMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                return [
                  ...prevMessages.slice(0, prevMessages.length - 1),
                  {
                    ...lastMessage,
                    content: `Error: ${response.error || 'An error occurred while processing your request'}`
                  }
                ];
              }
              return prevMessages;
            });
            
            if (onError) {
              onError(errorObj);
            }
            
            throw errorObj;
          }
          
          return ""; 
        } catch (err) {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          setStatus('error');
          setError(errorObj);
          
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [
                ...prevMessages.slice(0, prevMessages.length - 1),
                {
                  ...lastMessage,
                  content: `Error: ${errorObj.message}`
                }
              ];
            }
            return prevMessages;
          });
          
          if (onError) {
            onError(errorObj);
          }
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [
                ...prevMessages.slice(0, prevMessages.length - 1),
                {
                  ...lastMessage,
                  content: `Error: ${errorObj.message}`
                }
              ];
            }
            return prevMessages;
          });
          
          if (onError) {
            onError(errorObj);
          }
          
          throw errorObj;
        }
      }
      
      return "";
    },
    [body, chatId, messages, onError]
  );
  
  const reload = useCallback(
    async (options: ChatRequestOptions = {}) => {
      const lastUserMessageIndex = [...messages]
        .reverse()
        .findIndex((message) => message.role === 'user');
      
      if (lastUserMessageIndex === -1) {
        return;
      }
      
      const userMessageIndex = messages.length - 1 - lastUserMessageIndex;
      const userMessage = messages[userMessageIndex];
      
      setMessages((prevMessages) => prevMessages.slice(0, userMessageIndex + 1));
      
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };
      
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      
      setStatus('submitted');
      
      try {
        const currentMessages = messages.slice(0, userMessageIndex + 1);
        
        const combinedBody = {
          ...body,
          ...(options.body || {}),
        };
        
        const response = await window.electron.initiateChat(chatId, {
          ...combinedBody,
          messages: currentMessages,
          data: options.data,
        });
        
        if (!response.success) {
          const errorObj = new Error(response.error || 'Unknown error occurred');
          setStatus('error');
          setError(errorObj);
          
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [
                ...prevMessages.slice(0, prevMessages.length - 1),
                {
                  ...lastMessage,
                  content: `Error: ${response.error || 'An error occurred while processing your request'}`
                }
              ];
            }
            return prevMessages;
          });
          
          if (onError) {
            onError(errorObj);
          }
          
          throw errorObj;
        }
        
        return "";
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setStatus('error');
        setError(errorObj);
        
        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            return [
              ...prevMessages.slice(0, prevMessages.length - 1),
              {
                ...lastMessage,
                content: `Error: ${errorObj.message}`
              }
            ];
          }
          return prevMessages;
        });
        
        if (onError) {
          onError(errorObj);
        }
        
        throw errorObj;
      }
    },
    [body, chatId, messages, onError]
  );
  
  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    append,
    reload,
    stop,
    setMessages,
    error,
    status,
    data,
    setData,
    id: chatId,
  };
}