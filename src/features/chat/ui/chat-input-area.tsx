import { UnifiedInput } from './unified-input';
import { ActionsTab } from './ui/actions-tab';
import { MessagesTab } from './ui/messages-tab';
import { TasksTab } from './ui/tasks-tab';
import { SuggestionsTab } from './ui/suggestions-tab';
import { ConversationTab } from './ui/conversation-tab';
import { ChatSuggestions } from './chat-suggestions';
import { toast } from 'shared/hooks/use-toast';
import { useState, useCallback } from 'react';
import { Conversation } from '@/entities/conversation/model/types';
import { ChangeEvent, FormEvent } from 'react';

interface ChatInputAreaProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement> | ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => void;
  disabled: boolean;
  fileReferences: any[];
  setFileReferences: (fileRefs: any[]) => void;
  messages: any[];
  activeConversation: Conversation | null;
  activeSpace: any | null;
  onCreateConversation: (title?: string) => Promise<void>;
  onSelectConversation: (conversation: Conversation) => Promise<void>;
  onCommandWindowToggle: (mode: any) => void;
  onSelectFile: (file: any) => Promise<void>;
}

export function ChatInputArea({
  input,
  handleInputChange,
  handleSubmit,
  disabled,
  fileReferences,
  setFileReferences,
  messages,
  activeConversation,
  activeSpace,
  onCreateConversation,
  onSelectConversation,
  onCommandWindowToggle,
  onSelectFile
}: ChatInputAreaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [atCaretPosition, setAtCaretPosition] = useState<{x: number, y: number} | null>(null);

  const handleSuggestionQueryChange = (query: string, caretPosition: { x: number, y: number } | null) => {
    setSuggestionQuery(query);
    setAtCaretPosition(caretPosition);
    setShowSuggestions(true);
  };

  const handleSelectFile = useCallback(async (file: any) => {
    try {
      await onSelectFile(file);
    } finally {
      setShowSuggestions(false);
    }
  }, [onSelectFile]);

  return (
    <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[800px] z-50">
      <div className="relative w-full">
        <ChatSuggestions
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          suggestionQuery={suggestionQuery}
          atCaretPosition={atCaretPosition}
          input={input}
          handleInputChange={handleInputChange}
          onSelectFile={handleSelectFile}
        />

        <UnifiedInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={disabled}
          externalFileReferences={fileReferences}
          onFileReferencesChange={setFileReferences}
          onSuggestionQueryChange={handleSuggestionQueryChange}
          onSelectFile={handleSelectFile}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
        >
          <div className="flex items-center divide-x divide-white/[0.05]">
            <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
              <ActionsTab onCreateConversation={onCreateConversation} />
            </div>
            <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
              <MessagesTab
                messages={messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
                  id: m.id || '',
                  content: typeof m.content === 'string' ? m.content : '',
                  role: m.role as 'user' | 'assistant',
                  timestamp: m.createdAt && (typeof m.createdAt === 'string' || m.createdAt instanceof Date) ? 
                    new Date(m.createdAt) : 
                    new Date(),
                  annotations: m.annotations || []
                }))}
                conversationId={activeConversation?.id}
                conversationName={activeConversation?.title}
                spaceId={activeSpace?.id}
                spaceName={activeSpace?.name}
                onCommandWindowToggle={(mode) => onCommandWindowToggle(mode)}
                onMessageSearch={(query, searchScope) => {
                  if (searchScope === 'space') {
                    toast({
                      title: "Space Search",
                      description: `Searching entire space for "${query}"`,
                      variant: "default",
                    });
                  } else {
                    onCommandWindowToggle('messageSearch');
                  }
                }}
              />
            </div>
            <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
              <TasksTab />
            </div>
            <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
              <SuggestionsTab />
            </div>
            <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
              <ConversationTab
                onCreateConversation={onCreateConversation}
                onSelectConversation={onSelectConversation}
                activeConversation={activeConversation}
              />
            </div>
          </div>
        </UnifiedInput>
      </div>
    </div>
  );
} 