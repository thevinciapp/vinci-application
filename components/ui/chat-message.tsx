import { User } from 'lucide-react';
import { FC } from 'react';
import { getModelName, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';
import { Message } from 'ai';
import { MarkdownRenderer } from './markdown-renderer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatMessageProps {
    message: Message;
    userAvatarUrl?: string;
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
        {/* Subtle outer glow with dynamic pulsing */}
        <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-blue-400/20 to-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse-slow" />
        
        {/* Animated aura ring with rotating gradient */}
        <div className="absolute -inset-4 opacity-60">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/15 to-blue-500/15 animate-rotate-slow" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 animate-halo-pulse" />
        </div>
        
        {/* Main avatar container with dynamic gradient and shine */}
        <Avatar className="relative h-8 w-8 rounded-full bg-gradient-to-b from-cyan-900/30 to-blue-900/30 backdrop-blur-sm border border-white/20 shadow-lg shadow-cyan-500/30 overflow-hidden">
            <AvatarImage src="" />
            <AvatarFallback className="bg-transparent">
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Shimmering background with subtle particle effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 animate-shimmer" />
                    
                    {/* Subtle light rays with pulsing effect */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4),transparent_60%)] animate-pulse-slow" />
                    
                    {/* Central orb with dynamic glow */}
                    <div className="relative w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center animate-bounce-slow">
                        <div className="absolute inset-[1px] rounded-full bg-gradient-to-b from-white/70 to-white/30" />
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_8px_rgba(255,255,255,0.8)] animate-glow" />
                        
                        {/* Tiny particle effect for liveliness */}
                        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-white/50 rounded-full animate-float" />
                        <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-white/50 rounded-full animate-float delay-1000" />
                    </div>
                </div>
            </AvatarFallback>
        </Avatar>
    </div>
);

const ModelInfo = ({ provider, modelName }: { provider?: Provider; modelName: string }) => (
    <div className="flex items-center gap-1.5 mb-2.5">
        {provider && (
            <div className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
                <ProviderIcon provider={provider} size={14} />
            </div>
        )}
        <div className="px-2.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
            <span className="text-white">{modelName}</span>
        </div>
    </div>
);


export const ChatMessage: FC<ChatMessageProps> = ({ message, userAvatarUrl }) => {
    const isUser = message.role === 'user';

    const annotations = message.annotations as Array<{
        model_used?: string;
        provider?: string;
    }> | undefined;

    const modelAnnotation = annotations?.find(a => a.model_used);
    const providerAnnotation = annotations?.find(a => a.provider);

    const modelName = modelAnnotation?.model_used
        ? getModelName(modelAnnotation.provider as Provider, modelAnnotation.model_used)
        : 'AI';

    const providerName = providerAnnotation?.provider
        ? providerAnnotation.provider.charAt(0).toUpperCase() + providerAnnotation.provider.slice(1)
        : '';

    return (
        <div className={`flex items-start gap-4 w-full mx-auto group transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
            {isUser ? <UserAvatar avatarUrl={userAvatarUrl} /> : <AIAvatar />}

            <div className="space-y-2 overflow-hidden">
                <div className="prose prose-invert max-w-none w-full">
                    {message.role === 'assistant' && annotations && (
                        <ModelInfo
                            provider={providerAnnotation?.provider as Provider}
                            modelName={modelName}
                        />
                    )}

                    {isUser ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)]">
                            {message.content}
                        </div>
                    ) : (
                        <MarkdownRenderer content={message.content} />
                    )}
                </div>
            </div>
        </div>
    );
};
