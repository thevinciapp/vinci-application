import { User, MessageSquareIcon } from 'lucide-react';
import { FC, useState } from 'react';
import { getModelName, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';
import { JSONValue, Message } from 'ai';
import { MarkdownRenderer } from './markdown-renderer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StreamStatus } from './stream-status';
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';

interface ChatMessageProps {
    message: Message;
    userAvatarUrl?: string;
    isLoading?: boolean;
    streamData?: JSONValue[] | undefined;
}

// Define the SimilarMessage type
interface SimilarMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  score: number;
  metadata?: Record<string, any>;
}

const UserAvatar = ({ avatarUrl }: { avatarUrl?: string }) => (
    <Avatar className="h-8 w-8 border bg-white/[0.03] border-white/[0.1]">
        <AvatarImage src={avatarUrl || ""} />
        <AvatarFallback className="bg-white/[0.03]">
            <User className="h-4 w-4 text-white/80" />
        </AvatarFallback>
    </Avatar>
);

const AIAvatar = () => (
    <div className="relative group">
        {/* Refined outer glow */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/10 via-indigo-400/10 to-purple-500/10 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Elegant halo effect */}
        <div className="absolute -inset-3 opacity-0 group-hover:opacity-70 transition-opacity duration-500">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/8 to-indigo-500/8 animate-pulse-slow" />
        </div>
        
        {/* Main avatar container with polished styling */}
        <div className="relative h-8 w-8 flex items-center justify-center">
            <Avatar className="relative h-8 w-8 rounded-full backdrop-blur-sm border border-white/10 
                               shadow-[0_0_15px_rgba(56,189,248,0.15)] overflow-hidden
                               bg-gradient-to-b from-slate-800 to-slate-900">
                <AvatarImage src="" />
                <AvatarFallback className="bg-transparent">
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Glass effect background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm" />
                        
                        {/* Glossy highlight */}
                        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-full" />
                        
                        {/* Center circle with refined gradient */}
                        <div className="relative w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.5)]">
                            {/* Inner glow effect */}
                            <div className="absolute inset-[0.5px] rounded-full bg-gradient-to-b from-cyan-200/50 to-cyan-400/30" />
                            
                            {/* Reflective shine */}
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent rounded-t-full" />
                            
                            {/* Subtle pulse effect */}
                            <div className="absolute inset-0 rounded-full animate-pulse-slow" />
                        </div>
                    </div>
                </AvatarFallback>
            </Avatar>
            
            {/* Subtle orbital accent */}
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0.7)] animate-float" />
        </div>
    </div>
);

const ModelInfo = ({ provider, modelName, similarMessages }: { 
  provider?: Provider; 
  modelName: string;
  similarMessages?: SimilarMessage[];
}) => {
  const { openQuickActionsCommand } = useQuickActionsCommand();
  
  const hasSimilarMessages = similarMessages && similarMessages.length > 0;
  
  return (
    <div className="flex items-center gap-1.5 mb-2.5">
      {provider && (
        <div className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
          <ProviderIcon provider={provider} size={14} />
        </div>
      )}
      <div className="px-2.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
        <span className="text-white">{modelName}</span>
      </div>
      
      {hasSimilarMessages && (
        <button
          onClick={() => openQuickActionsCommand({ 
            withSimilarMessages: true, 
            similarMessages 
          })}
          className="px-2.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10 hover:bg-white/[0.07] transition-colors"
        >
          <MessageSquareIcon size={11} className="text-cyan-400/80" />
          <span>{similarMessages.length} similar</span>
        </button>
      )}
    </div>
  );
};

export const ChatMessage: FC<ChatMessageProps> = ({ message, userAvatarUrl, isLoading, streamData }) => {
    const isUser = message.role === 'user';

    const annotations = message.annotations as Array<{
        model_used?: string;
        provider?: string;
        similarMessages?: SimilarMessage[];
    }> | undefined;

    const modelAnnotation = annotations?.find(a => a.model_used);
    const providerAnnotation = annotations?.find(a => a.provider);
    const similarMessagesAnnotation = annotations?.find(a => a.similarMessages);
    
    const similarMessages = similarMessagesAnnotation?.similarMessages || [];

    const modelName = modelAnnotation?.model_used
        ? getModelName(modelAnnotation.provider as Provider, modelAnnotation.model_used)
        : 'AI';

    const providerName = providerAnnotation?.provider
        ? providerAnnotation.provider.charAt(0).toUpperCase() + providerAnnotation.provider.slice(1)
        : '';

    
    const isStreamingAssistant = !isUser && isLoading && message.content.length <= 0

    return (
        <div className={`flex items-start gap-4 w-full mx-auto group transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
            {isUser ? <UserAvatar avatarUrl={userAvatarUrl} /> : <AIAvatar />}

            <div className="space-y-2 overflow-hidden max-w-[85%]">
                <div className="prose prose-invert max-w-none w-full">
                    {message.role === 'assistant' && annotations && !isStreamingAssistant && (
                        <ModelInfo
                            provider={providerAnnotation?.provider as Provider}
                            modelName={modelName}
                            similarMessages={similarMessages}
                        />
                    )}

                    {isUser ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)]">
                            {message.content}
                        </div>
                    ) : isStreamingAssistant ? (
                        <div className="transition-all duration-500 ease-in-out will-change-transform">
                            {annotations && (
                                <ModelInfo
                                    provider={providerAnnotation?.provider as Provider}
                                    modelName={modelName}
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
                        <MarkdownRenderer content={message.content} />
                    )}
                </div>
            </div>
        </div>
    );
};
