import { User, MessageSquareIcon, Sparkles, FileText, File } from 'lucide-react';
import { memo, useMemo } from 'react';
import { ProviderIcon } from './provider-icon';
import { JSONValue } from 'ai';
import { Avatar, AvatarFallback, AvatarImage } from 'vinci-ui';
import { StreamStatus } from './stream-status';
import { Markdown } from './markdown';
import { Message, MessageAnnotation, SimilarMessage } from '@/types/message';
import { Provider } from '@/types/provider';
import DotSphere from '../space/planet-icon';
import { ModelDisplay } from '@/components/shared/model-display';
import { getModelDisplayInfo } from '@/utils/model-utils';

interface ChatMessageProps {
  message: Message;
  userAvatarUrl?: string;
  isLoading?: boolean;
  streamData?: JSONValue[];
  spaceId?: string;
}

const UserMessageWithMentions = memo(({ id, content }: { id: string, content: string }) => {
  const processedContent = useMemo(() => {
    const fileTagRegex = /@\[(.*?)\]\((.*?)\)/g;
    if (!fileTagRegex.test(content)) return <span>{content}</span>;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let match;
    
    fileTagRegex.lastIndex = 0;
    while ((match = fileTagRegex.exec(content)) !== null) {
      const [fullMatch, fileName, filePath] = match;
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${key++}`}>{content.substring(lastIndex, match.index)}</span>);
      }
      parts.push(
        <span key={`file-${key++}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 mr-1 rounded bg-cyan-500/20 text-xs text-cyan-300" title={filePath}>
          <File className="h-3 w-3" />
          <span className="truncate max-w-[150px]">{fileName}</span>
        </span>
      );
      lastIndex = match.index + fullMatch.length;
    }
    if (lastIndex < content.length) {
      parts.push(<span key={`text-${key++}`}>{content.substring(lastIndex)}</span>);
    }
    return <>{parts}</>;
  }, [content]);
  
  return <div id={id}>{processedContent}</div>;
});

const UserAvatar = ({ avatarUrl }: { avatarUrl?: string }) => (
  <Avatar className="h-10 w-10 border bg-white/[0.03] border-white/[0.1]">
    <AvatarImage src={avatarUrl || ""} />
    <AvatarFallback className="bg-white/[0.03]">
      <User className="h-5 w-5 text-white/80" />
    </AvatarFallback>
  </Avatar>
);

const AIAvatar = ({ spaceId }: { spaceId?: string }) => (
  <div className="relative">
    <div className="relative h-12 w-12 flex items-center justify-center">
      <DotSphere size={40} seed={spaceId || "default-space"} dotCount={80} dotSize={0.9} expandFactor={1.15} transitionSpeed={400} highPerformance={true} />
    </div>
  </div>
);

const ModelInfo = ({ provider, modelName, similarMessages, chatMode }: { 
  provider?: Provider; 
  modelName: string;
  similarMessages?: SimilarMessage[];
  chatMode?: string;
}) => {
  const ModeModeIcon = Sparkles;
  const similarMessagesCount = similarMessages?.length ?? 0;
  const modelInfo = getModelDisplayInfo(modelName);
  
  return (
    <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
      {modelInfo && <ModelDisplay modelInfo={modelInfo} showIcon={true} />}
      {chatMode && (
        <div className="px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit">
          <ModeModeIcon size={11} />
          <span>{chatMode}</span>
        </div>
      )}
      {similarMessagesCount > 0 && similarMessages && (
        <button 
          onClick={() => {
            const win = window as any;
            if (win.openSimilarMessages) {
              win.openSimilarMessages(similarMessages);
            }
          }} 
          className="px-2.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit before:absolute before:inset-0 before:bg-linear-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10 hover:bg-white/[0.07] transition-colors"
        >
          <MessageSquareIcon size={11} className="text-cyan-400/80" />
          <span>{similarMessagesCount} similar</span>
        </button>
      )}
    </div>
  );
};

export const ChatMessage = memo<ChatMessageProps>(({ message, userAvatarUrl, isLoading, streamData, spaceId }) => {
  const isUser = message.role === 'user';
  const isStreamingAssistant = !isUser && ((isLoading && message.content.length <= 0) || message.id === 'placeholder-assistant');

  const modelAnnotation = message.annotations?.[0] as MessageAnnotation | undefined;
  const provider = modelAnnotation?.provider;
  const modelUsed = modelAnnotation?.model_used;
  const chatMode = modelAnnotation?.chat_mode;
  const similarMessages = modelAnnotation?.similarMessages;
  const modelName = modelUsed || 'AI';

  return (
    <div className={`flex items-start gap-5 w-full mx-auto group transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`shrink-0 ${isUser ? '' : 'mt-1'}`}>
        {isUser ? <UserAvatar avatarUrl={userAvatarUrl} /> : <AIAvatar spaceId={spaceId} />}
      </div>
      <div className="space-y-2 overflow-hidden max-w-[85%]">
        <div className="prose prose-invert max-w-none w-full">
          {!isUser && message.annotations && message.annotations.length > 0 && (
            <ModelInfo
              provider={provider}
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
              <div className="animate-appear transform-gpu transition-all duration-500 ease-out">
                <StreamStatus streamData={streamData} />
              </div>
            </div>
          ) : (
            <div className="prose prose-invert prose-zinc max-w-none">
              <Markdown id={message.id}>{message.content}</Markdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.role !== nextProps.message.role) return false;
  if (prevProps.message.role === 'user') return prevProps.message.content === nextProps.message.content;
  
  const isStreamingPrev = prevProps.isLoading && (prevProps.message.id === 'placeholder-assistant' || prevProps.message.content.length === 0);
  const isStreamingNext = nextProps.isLoading && (nextProps.message.id === 'placeholder-assistant' || nextProps.message.content.length === 0);
  
  if (isStreamingPrev !== isStreamingNext) return false;
  
  if (isStreamingNext && prevProps.streamData && nextProps.streamData) {
    const prevLength = prevProps.streamData.length;
    const nextLength = nextProps.streamData.length;
    return nextLength <= prevLength || (nextLength - prevLength < 5);
  }
  
  return prevProps.message.content === nextProps.message.content;
});

ChatMessage.displayName = 'ChatMessage';
