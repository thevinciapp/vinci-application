import { User, MessageSquareIcon, Sparkles, FileText } from 'lucide-react';
import { memo, useMemo } from 'react';
import { getModelName, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';
import { JSONValue, Message } from 'ai';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/common/avatar';
import { StreamStatus } from './stream-status';
import { Markdown } from './markdown';
import DotSphere from '@/components/ui/space/planet-icon';
import { useSpaceStore } from '@/stores/space-store';
import { getChatModeConfig } from '@/config/chat-modes';
import { SimilarMessage } from '@/types';

// Component for rendering user messages with file mentions
const UserMessageWithMentions = memo(({ id, content }: { id: string, content: string }) => {
  // Process the content to identify and render filenames as tags
  const processedContent = useMemo(() => {
    // Simple regex to detect file patterns with extensions
    // This will match common file extensions
    const fileRegex = /\b[\w-]+\.(pdf|doc|docx|txt|jpg|png|gif|mp4|mp3|xls|xlsx|ppt|pptx|zip|rar)\b/g;
    
    if (!fileRegex.test(content)) {
      // If no file patterns found, return the plain content
      return <span>{content}</span>;
    }
    
    // Split the content by file mentions and render each part
    const parts = [];
    let lastIndex = 0;
    let match;
    let key = 0;
    
    // Reset regex to start from beginning
    fileRegex.lastIndex = 0;
    
    // Find all file patterns in text
    while ((match = fileRegex.exec(content)) !== null) {
      // Add text before the filename
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      // Add the file as a tag component
      const fileName = match[0]; // The complete filename with extension
      parts.push(
        <span 
          key={`file-${key++}`}
          className="inline-flex items-center gap-1 px-2 py-1 mr-1 rounded bg-white/10 text-xs text-white/90"
        >
          <FileText className="h-3 w-3 text-cyan-400" />
          <span className="truncate max-w-[150px]">{fileName}</span>
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${key++}`}>
          {content.substring(lastIndex)}
        </span>
      );
    }
    
    return <>{parts}</>;
  }, [content]);
  
  return (
    <div id={id}>
      {processedContent}
    </div>
  );
});

interface ChatMessageProps {
    message: Message;
    userAvatarUrl?: string;
    isLoading?: boolean;
    streamData?: JSONValue[] | undefined;
}

// Interface for chat mode annotation
interface ChatModeAnnotation {
  chat_mode?: string;
  chat_mode_config?: {
    tools: string[];
    mcp_servers?: string[];
  };
}

const UserAvatar = ({ avatarUrl }: { avatarUrl?: string }) => (
    <Avatar className="h-10 w-10 border bg-white/[0.03] border-white/[0.1]">
        <AvatarImage src={avatarUrl || ""} />
        <AvatarFallback className="bg-white/[0.03]">
            <User className="h-5 w-5 text-white/80" />
        </AvatarFallback>
    </Avatar>
);

const AIAvatar = () => {
    // Use the active space ID from the store as the seed
    // This ensures the AIAvatar looks identical to the active space's DotSphere
    const activeSpace = useSpaceStore(state => state.activeSpace);
    const seed = activeSpace?.id || "default-space"; // Fallback if no active space
    
    return (
        <div className="relative group">
            {/* Refined outer glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/10 via-indigo-400/10 to-purple-500/10 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* Elegant halo effect */}
            <div className="absolute -inset-4 opacity-0 group-hover:opacity-70 transition-opacity duration-500">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/8 to-indigo-500/8 animate-pulse-slow" />
            </div>
            
            {/* DotSphere component as the avatar - using exact same props as space-tab.tsx except for size */}
            <div className="relative h-12 w-12 flex items-center justify-center">
                <DotSphere 
                    size={40} 
                    seed={seed} 
                    dotCount={80} 
                    dotSize={0.9} 
                    expandFactor={1.15} 
                    transitionSpeed={400}
                    highPerformance={true}
                />
            </div>
        </div>
    );
};

const ModelInfo = ({ provider, modelName, similarMessages, chatMode }: { 
  provider?: Provider; 
  modelName: string;
  similarMessages?: SimilarMessage[];
  chatMode?: string;
}) => {
  const hasSimilarMessages = similarMessages && similarMessages.length > 0;
  
  // Get the chat mode configuration if available
  const modeConfig = chatMode ? getChatModeConfig(chatMode) : null;
  const ModeModeIcon = modeConfig?.icon || Sparkles;
  
  return (
    <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
      {provider && (
        <div className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
          <ProviderIcon provider={provider} size={14} />
        </div>
      )}
      <div className="px-2.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
        <span className="text-white">{modelName}</span>
      </div>
      
      {/* Chat mode badge */}
      {chatMode && modeConfig && (
        <div className="px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit">
          <ModeModeIcon size={11} />
          <span>{modeConfig.name}</span>
        </div>
      )}
      
      {hasSimilarMessages && (
        <button
          className="px-2.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10 hover:bg-white/[0.07] transition-colors"
          onClick={() => {
            if (window.openSimilarMessages) {
              window.openSimilarMessages(similarMessages);
            }
          }}
        >
          <MessageSquareIcon size={11} className="text-cyan-400/80" />
          <span>{similarMessages.length} similar</span>
        </button>
      )}
    </div>
  );
};

export const ChatMessage = memo<ChatMessageProps>(
    ({ message, userAvatarUrl, isLoading, streamData }) => {
        const isUser = message.role === 'user';

        const annotations = message.annotations as Array<{
            model_used?: string;
            provider?: string;
            similarMessages?: SimilarMessage[];
            chat_mode?: string;
            chat_mode_config?: {
                tools: string[];
                mcp_servers?: string[];
            };
        }> | undefined;

        const modelAnnotation = annotations?.find(a => a.model_used);
        const providerAnnotation = annotations?.find(a => a.provider);
        const similarMessagesAnnotation = annotations?.find(a => a.similarMessages);
        const chatModeAnnotation = annotations?.find(a => a.chat_mode);
        
        const similarMessages = similarMessagesAnnotation?.similarMessages || [];
        const chatMode = chatModeAnnotation?.chat_mode;

        const modelName = modelAnnotation?.model_used
            ? getModelName(modelAnnotation.provider as Provider, modelAnnotation.model_used)
            : 'AI';

        const providerName = providerAnnotation?.provider
            ? providerAnnotation.provider.charAt(0).toUpperCase() + providerAnnotation.provider.slice(1)
            : '';

        
        const isStreamingAssistant = !isUser && (
            // Handle regular streaming scenario
            (isLoading && message.content.length <= 0) || 
            // Handle placeholder message scenario
            message.id === 'placeholder-assistant'
        );

        return (
            <div className={`flex items-start gap-5 w-full mx-auto group transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 ${isUser ? '' : 'mt-1'}`}>
                    {isUser ? <UserAvatar avatarUrl={userAvatarUrl} /> : <AIAvatar />}
                </div>

                <div className="space-y-2 overflow-hidden max-w-[85%]">
                    <div className="prose prose-invert max-w-none w-full">
                    {message.role === 'assistant' && annotations && !isStreamingAssistant && (
                            <ModelInfo
                                provider={providerAnnotation?.provider as Provider}
                                modelName={modelName}
                                similarMessages={similarMessages}
                                chatMode={chatMode}
                            />
                        )}

                        {isUser ? (
                            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)]">
                                <UserMessageWithMentions id={`user-${message.id}`} content={message.content} />
                            </div>
                        ) : isStreamingAssistant ? (
                            <div className="transition-all duration-500 ease-in-out will-change-transform">
                            {annotations && (
                                <ModelInfo
                                    provider={providerAnnotation?.provider as Provider}
                                    modelName={modelName}
                                    chatMode={chatMode}
                                />
                            )}
                                {/* Add a growing animation to the StreamStatus container */}
                                <div 
                                    className="animate-appear transform-gpu transition-all duration-500 ease-out"
                                    style={{ animationFillMode: 'both' }}
                                >
                                    <StreamStatus streamData={streamData} />
                                </div>
                            </div>
                        ) : (
                            <div className="prose prose-invert prose-zinc max-w-none">
                                <Markdown id={message.id}>
                                    {message.content}
                                </Markdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
);

// Add a display name for easier debugging
ChatMessage.displayName = 'ChatMessage';
