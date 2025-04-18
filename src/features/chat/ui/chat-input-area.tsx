import { UnifiedInput } from '@/features/chat/ui/unified-input';
import { ActionsTab } from '@/features/chat/ui/actions-tab';
import { MessagesTab } from '@/features/chat/ui/messages-tab';
import { TasksTab } from '@/features/chat/ui/tasks-tab';
import { SuggestionsTab } from '@/features/chat/ui/suggestions-tab';
import { ConversationTab } from '@/features/chat/ui/conversation-tab';
import { ChatSuggestions } from '@/features/chat/ui/chat-suggestions';
import { toast } from '@/shared/hooks/use-toast';
import { useState, useCallback, ChangeEvent } from 'react';
import { Conversation } from '@/entities/conversation/model/types';
import { FileReference, FileTag } from '@/entities/file/model/types';
import { VinciUIMessage } from '@/entities/message/model/types';

interface ChatInputAreaProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement> | ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => void;
  disabled: boolean;
  fileReferences: FileReference[];
  setFileReferences: (fileRefs: FileReference[]) => void;
  messages: VinciUIMessage[];
  activeConversation: Conversation | null;
  activeSpace: Conversation | null;
  onCreateConversation: (title?: string) => Promise<void>;
  onSelectConversation: (conversation: Conversation) => Promise<void>;
  onCommandWindowToggle: (mode: 'command' | 'messageSearch') => void;
  onSelectFile: (file: FileReference) => Promise<void>;
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

  const handleSelectFile = useCallback(async (fileTag: FileTag) => {
    try {
      // Find the full FileReference using the id from FileTag
      const fullFileRef = fileReferences.find(ref => ref.id === fileTag.id);
      if (fullFileRef) {
        await onSelectFile(fullFileRef);
      } else {
        console.error(`Could not find full FileReference for FileTag with id: ${fileTag.id}`);
        toast({
          title: "Error",
          description: `Could not find file details for ${fileTag.name}`,
          variant: "destructive",
        });
      }
    } finally {
      setShowSuggestions(false);
    }
  }, [onSelectFile, fileReferences]);

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
                  annotations: [] // Pass empty array to satisfy type, actual transformation needed
                }))}
                conversationName={activeConversation?.title}
                spaceId={activeSpace?.id}
                spaceName={activeSpace?.title}
                onCommandWindowToggle={(mode) => onCommandWindowToggle(mode as 'command' | 'messageSearch')}
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
              <ConversationTab />
            </div>
          </div>
        </UnifiedInput>
      </div>
    </div>
  );
} 