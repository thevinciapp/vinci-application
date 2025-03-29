import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { ArrowDown, Search, File, Loader2, MessageSquare, Calendar, Mail, Github, Hash, CheckSquare } from 'lucide-react';
import { useSpaces } from '@/hooks/use-spaces';
import { useConversations } from '@/hooks/use-conversations';
import { UnifiedInput } from './unified-input';
import { ChatMessages } from './chat-messages';
import { UserProfileDropdown } from '@/components/auth/user-profile-dropdown';
import { SpaceTab } from '@/components/chat/ui/space-tab';
import { ModelTab } from '@/components/chat/ui/model-tab';
import { ChatModeTab } from '@/components/chat/ui/chat-mode-tab';
import { ActionsTab } from '@/components/chat/ui/actions-tab';
import { TasksTab } from '@/components/chat/ui/tasks-tab';
import { SuggestionsTab } from '@/components/chat/ui/suggestions-tab';
import { MessagesTab } from '@/components/chat/ui/messages-tab';
import { useRendererStore } from '@/store/renderer';
import { API_BASE_URL } from '@/config/api';
import { useCommandWindow } from '@/hooks/use-command-window';
import { ConversationTab } from '@/components/chat/ui/conversation-tab';
import { BaseTab } from '@/components/ui/base-tab';
import { toast } from '@/hooks/use-toast';
import { Conversation } from '@/types/conversation';
import path from 'path';
import { CommandCenterEvents, MessageEvents } from '@/core/ipc/constants';
import { DropdownSection, DropdownItem, DropdownList } from '@/components/shared/dropdown-list';

type FileTag = {
  id: string
  name: string
  path: string
}

type MessageTag = {
  id: string
  name: string
  conversationTitle: string
  role: 'user' | 'assistant' | 'system'
  conversationId: string
}

type GmailItem = {
  id: string;
  subject: string;
  sender: string;
  date: string;
  preview: string;
  isUnread?: boolean;
};

type SlackMessage = {
  id: string;
  content: string;
  sender: string;
  channel: string;
  workspace: string;
  timestamp: string;
  hasThread?: boolean;
  replyCount?: number;
};

type LinearItem = {
  id: string;
  title: string;
  type: 'issue' | 'project' | 'cycle';
  status: 'todo' | 'inProgress' | 'done' | 'canceled';
  team: string;
  assignee?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
};

export default function ChatContent() {
  const { user, messages: messagesFromStore } = useRendererStore();
  const { activeSpace, isLoading: isSpaceLoading } = useSpaces();
  const { 
    activeConversation, 
    setActiveConversation,
    createConversation 
  } = useConversations();
  const { handleCommandWindowToggle } = useCommandWindow();

  const [searchMode, setSearchMode] = useState<'chat' | 'search' | 'semantic' | 'hybrid'>('chat');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [fileReferences, setFileReferences] = useState<any[]>([]);
  const [isStickToBottom, setIsStickToBottom] = useState(true);

  // Suggestion states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [fileResults, setFileResults] = useState<FileTag[]>([]);
  const [messageResults, setMessageResults] = useState<MessageTag[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [atCaretPosition, setAtCaretPosition] = useState<{x: number, y: number} | null>(null);

  // State to track selected category
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Default items to show when @ is typed but no search query yet
  const [defaultFiles, setDefaultFiles] = useState<FileTag[]>([]);
  const [defaultMessages, setDefaultMessages] = useState<MessageTag[]>([]);
  const [defaultCalendarEvents, setDefaultCalendarEvents] = useState<any[]>([]);
  const [defaultGithubItems, setDefaultGithubItems] = useState<any[]>([]);
  const [defaultGmailItems, setDefaultGmailItems] = useState<any[]>([]);
  const [defaultSlackMessages, setDefaultSlackMessages] = useState<any[]>([]);
  const [defaultLinearItems, setDefaultLinearItems] = useState<any[]>([]);

  // Search result states
  const [calendarResults, setCalendarResults] = useState<any[]>([]);
  const [githubResults, setGithubResults] = useState<any[]>([]);
  const [gmailResults, setGmailResults] = useState<any[]>([]);
  const [slackResults, setSlackResults] = useState<any[]>([]);
  const [linearResults, setLinearResults] = useState<any[]>([]);

  // Create sample types for the new categories
  type CalendarEvent = {
    id: string;
    title: string;
    date: string;
    time: string;
    attendees?: number;
  };

  type GithubItem = {
    id: string;
    name: string;
    type: 'repository' | 'issue' | 'pr';
    owner: string;
    description?: string;
  };

  const clearFileReferences = () => setFileReferences([]);
  const fileReferencesMap = useMemo(() => {
    const fileMap: Record<string, any> = {};
    fileReferences.forEach(fileRef => {
      fileMap[fileRef.id] = {
        id: fileRef.id,
        path: fileRef.path,
        name: fileRef.name,
        content: fileRef.content,
        type: fileRef.type
      };
    });
    return fileMap;
  }, [fileReferences]);

  const initialMessages = useMemo(() => messagesFromStore || [], [messagesFromStore]);

  const chatKey = `${activeConversation?.id || 'default'}-${activeSpace?.provider || ''}-${activeSpace?.model || ''}`;
  
  async function getHeaders() {
    const response = await window.electron.invoke('AUTH_TOKEN');
    console.log('Get auth token response:', response);
    if (!response.success || !response.data) {
      throw new Error('Failed to get access token');
    }
    return {
      Authorization: `Bearer ${response.data.accessToken}`,
    };
  }

  const customFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    console.log('Custom fetch called with URL:', input);
    console.log('Custom fetch called with init:', init);
    const headers = await getHeaders(); 

    console.log('Headers:', headers);

    const url = typeof input === 'string' ? input : input.toString();

    const updatedOptions: RequestInit = {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...headers,
      },
    };

    console.log('Custom fetch called with updated URL:', url);

    return fetch(url, updatedOptions); 
  };

  const chatConfig = useMemo(() => ({
    id: chatKey,
    api: `${API_BASE_URL}/api/chat`,
    initialMessages: initialMessages as any,
    fetch: customFetch,
    body: {
      spaceId: activeSpace?.id || '',
      conversationId: activeConversation?.id || null,
      provider: activeSpace?.provider || '',
      model: activeSpace?.model || '',
      searchMode,
      chatMode: activeSpace?.chat_mode || 'ask',
      chatModeConfig: activeSpace?.chat_mode_config || { tools: [] },
      files: fileReferencesMap,
    },
    onFinish() {
      setData([]);
      clearFileReferences();
    },
  }), [
    chatKey,
    initialMessages,
    customFetch,
    activeSpace?.id,
    activeConversation?.id,
    activeSpace?.provider,
    activeSpace?.model,
    searchMode,
    activeSpace?.chat_mode,
    activeSpace?.chat_mode_config,
    fileReferencesMap,
  ]);

  const {
    messages,
    input,
    status,
    handleInputChange,
    handleSubmit,
    data,
    setData,
  } = useChat(chatConfig);

  // Search for files using CommandCenterEvents
  const searchFiles = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFileResults([]);
      return;
    }

    // Skip search if a category other than files is selected
    if (selectedCategory && selectedCategory !== 'files') {
      setFileResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await window.electron.invoke(CommandCenterEvents.SEARCH_FILES, {
        query,
        limit: 10,
        type: 'file',
        includeContent: false,
      });
      
      if (response.success && response.data) {
        const fileTags: FileTag[] = response.data
          .filter((item: any) => item && item.path)
          .map((item: any) => ({
            id: item.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: item.name || item.fileName || path.basename(item.path),
            path: item.path,
          }));
        
        setFileResults(fileTags);
      } else {
        console.error("Error searching files:", response.error);
        setFileResults([]);
      }
    } catch (error) {
      console.error("Error searching files:", error);
      setFileResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedCategory]);

  // Fetch default items when needed
  const fetchDefaultItems = useCallback(async () => {
    // Only fetch if we don't have defaults yet
    if (defaultFiles.length === 0) {
      setIsSearching(true);
      try {
        // Fetch recent files
        const response = await window.electron.invoke(CommandCenterEvents.SEARCH_FILES, {
          query: '',
          limit: 5,
          type: 'file',
          includeContent: false,
          sortBy: 'recentlyUsed'
        });
        
        if (response.success && response.data) {
          const fileTags: FileTag[] = response.data
            .filter((item: any) => item && item.path)
            .map((item: any) => ({
              id: item.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: item.name || item.fileName || path.basename(item.path),
              path: item.path,
            }));
          
          setDefaultFiles(fileTags);
        }
        
        // Mock calendar events
        if (defaultCalendarEvents.length === 0) {
          // In a real implementation, you would fetch this from a calendar API
          const mockCalendarEvents: CalendarEvent[] = [
            {
              id: 'cal-1',
              title: 'Team Standup',
              date: '2023-10-09',
              time: '10:00 AM',
              attendees: 5
            },
            {
              id: 'cal-2',
              title: 'Product Review',
              date: '2023-10-09',
              time: '2:00 PM',
              attendees: 8
            }
          ];
          setDefaultCalendarEvents(mockCalendarEvents);
        }
        
        // Mock GitHub items
        if (defaultGithubItems.length === 0) {
          // In a real implementation, you would fetch this from GitHub API
          const mockGithubItems: GithubItem[] = [
            {
              id: 'gh-1',
              name: 'vinci-application',
              type: 'repository',
              owner: 'spatial',
              description: 'Main application repository'
            },
            {
              id: 'gh-2',
              name: 'Fix dropdown menu styling',
              type: 'issue',
              owner: 'spatial',
              description: 'Issue #42'
            }
          ];
          setDefaultGithubItems(mockGithubItems);
        }
        
        // Mock Gmail items
        if (defaultGmailItems.length === 0) {
          // In a real implementation, you would fetch this from Gmail API
          const mockGmailItems: GmailItem[] = [
            {
              id: 'gm-1',
              subject: 'Weekly Product Update',
              sender: 'product@company.com',
              date: '2023-10-08',
              preview: 'Here are this week\'s product updates...',
              isUnread: true
            },
            {
              id: 'gm-2',
              subject: 'Meeting Notes: Design Review',
              sender: 'design@company.com',
              date: '2023-10-07',
              preview: 'Attached are the notes from our design review session.'
            }
          ];
          setDefaultGmailItems(mockGmailItems);
        }
        
        // Mock Slack messages
        if (defaultSlackMessages.length === 0) {
          // In a real implementation, you would fetch this from Slack API
          const mockSlackMessages: SlackMessage[] = [
            {
              id: 'sl-1',
              content: 'Has anyone started looking at the new file suggestion dropdown?',
              sender: 'Dallin Pyrah',
              channel: 'project-vinci',
              workspace: 'Spatial',
              timestamp: '10:32 AM',
              hasThread: true,
              replyCount: 3
            },
            {
              id: 'sl-2',
              content: 'I pushed the design updates to the staging environment, please review',
              sender: 'Alex Chen',
              channel: 'design-feedback',
              workspace: 'Spatial',
              timestamp: 'Yesterday at 4:15 PM'
            },
            {
              id: 'sl-3',
              content: 'Reminder: Team sync at 3PM today',
              sender: 'Sarah Kim',
              channel: 'team-announcements',
              workspace: 'Spatial',
              timestamp: 'Yesterday at 9:00 AM'
            }
          ];
          setDefaultSlackMessages(mockSlackMessages);
        }
        
        // Mock Linear items
        if (defaultLinearItems.length === 0) {
          // In a real implementation, you would fetch this from Linear API
          const mockLinearItems: LinearItem[] = [
            {
              id: 'ln-1',
              title: 'Implement file suggestion dropdown',
              type: 'issue',
              status: 'inProgress',
              team: 'Frontend',
              assignee: 'You',
              priority: 'high'
            },
            {
              id: 'ln-2',
              title: 'Fix dropdown menu styling',
              type: 'issue',
              status: 'todo',
              team: 'Frontend',
              priority: 'medium'
            },
            {
              id: 'ln-3',
              title: 'Q4 Platform Improvements',
              type: 'project',
              status: 'inProgress',
              team: 'Product',
              assignee: 'Sarah Kim'
            }
          ];
          setDefaultLinearItems(mockLinearItems);
        }
        
      } catch (error) {
        console.error("Error fetching default items:", error);
      } finally {
        setIsSearching(false);
      }
    }
  }, [
    defaultFiles.length, 
    defaultCalendarEvents.length, 
    defaultGithubItems.length, 
    defaultGmailItems.length,
    defaultSlackMessages.length,
    defaultLinearItems.length
  ]);

  // Effect to update search results when query changes
  useEffect(() => {
    if (suggestionQuery && suggestionQuery.trim()) {
      searchFiles(suggestionQuery);
    } else if (showSuggestions) {
      // If dropdown is showing but no query, load default items
      fetchDefaultItems();
      setFileResults([]);
      setMessageResults([]);
    }
  }, [suggestionQuery, searchFiles, fetchDefaultItems, showSuggestions]);

  // Select a file from suggestions
  const selectFile = async (file: FileTag) => {
    setIsSearching(true);
    
    try {
      let fileContent = '';
      
      try {
        const response = await window.electron.invoke(CommandCenterEvents.READ_FILE, {
          filePath: file.path,
          maxSize: 1024 * 1024,
        });
        
        if (response.success && response.data) {
          fileContent = response.data.content;
        } else {
          fileContent = `[Error loading file content: ${response.error}]`;
        }
      } catch (error) {
        fileContent = `[Error loading file content: ${error instanceof Error ? error.message : String(error)}]`;
      }
      
      // Create a unique ID for this file if it doesn't have one
      const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add the file reference with content
      setFileReferences(prev => {
        const existingFileIndex = prev.findIndex(ref => ref.id === fileId);
        if (existingFileIndex !== -1) {
          const updatedReferences = [...prev];
          updatedReferences[existingFileIndex] = {
            id: fileId,
            path: file.path,
            name: file.name,
            content: fileContent,
            type: 'file'
          };
          return updatedReferences;
        } else {
          return [...prev, {
            id: fileId,
            path: file.path,
            name: file.name,
            content: fileContent,
            type: 'file'
          }];
        }
      });
      
      // Process input to replace @query with empty string
      if (input.includes('@')) {
        const atIndex = input.lastIndexOf('@');
        const newInput = input.substring(0, atIndex);
        handleInputChange({ target: { value: newInput } } as any);
      }
      
    } catch (error) {
      console.error("Error selecting file:", error);
    } finally {
      setShowSuggestions(false);
      setIsSearching(false);
    }
  };

  // Track suggestion-related actions
  const handleSuggestionQueryChange = (query: string, caretPosition: { x: number, y: number } | null) => {
    setSuggestionQuery(query);
    setAtCaretPosition(caretPosition);
    
    // Always show suggestions when @ is typed, even with empty query
    setShowSuggestions(true);
    
    // Fetch default items when first opening the dropdown
    if (!query.trim()) {
      fetchDefaultItems();
    }
    
    // Only actively search when there's something to search for
    if (query.trim()) {
      searchFiles(query);
    } else {
      setFileResults([]);
      setMessageResults([]);
    }
  };

  // Select a category
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId);
  };

  // Create memoized filtered results for all categories
  const filteredFiles = useMemo(() => {
    return suggestionQuery.trim() ? fileResults : defaultFiles;
  }, [suggestionQuery, fileResults, defaultFiles]);

  const filteredMessages = useMemo(() => {
    return suggestionQuery.trim() ? messageResults : defaultMessages;
  }, [suggestionQuery, messageResults, defaultMessages]);

  const filteredCalendarEvents = useMemo(() => {
    return suggestionQuery.trim() ? calendarResults : defaultCalendarEvents;
  }, [suggestionQuery, calendarResults, defaultCalendarEvents]);

  const filteredGithubItems = useMemo(() => {
    return suggestionQuery.trim() ? githubResults : defaultGithubItems;
  }, [suggestionQuery, githubResults, defaultGithubItems]);

  const filteredGmailItems = useMemo(() => {
    return suggestionQuery.trim() ? gmailResults : defaultGmailItems;
  }, [suggestionQuery, gmailResults, defaultGmailItems]);
  
  const filteredSlackMessages = useMemo(() => {
    return suggestionQuery.trim() ? slackResults : defaultSlackMessages;
  }, [suggestionQuery, slackResults, defaultSlackMessages]);
  
  const filteredLinearItems = useMemo(() => {
    return suggestionQuery.trim() ? linearResults : defaultLinearItems;
  }, [suggestionQuery, linearResults, defaultLinearItems]);

  const hasAnyResults = useMemo(() => {
    if (selectedCategory === 'files') {
      return filteredFiles.length > 0;
    } else if (selectedCategory === 'messages') {
      return filteredMessages.length > 0;
    } else if (selectedCategory === 'calendar') {
      return filteredCalendarEvents.length > 0;
    } else if (selectedCategory === 'github') {
      return filteredGithubItems.length > 0;
    } else if (selectedCategory === 'gmail') {
      return filteredGmailItems.length > 0;
    } else if (selectedCategory === 'slack') {
      return filteredSlackMessages.length > 0;
    } else if (selectedCategory === 'linear') {
      return filteredLinearItems.length > 0;
    }
    return filteredFiles.length > 0 || 
           filteredMessages.length > 0 ||
           filteredCalendarEvents.length > 0 ||
           filteredGithubItems.length > 0 ||
           filteredGmailItems.length > 0 ||
           filteredSlackMessages.length > 0 ||
           filteredLinearItems.length > 0;
  }, [
    filteredFiles, 
    filteredMessages, 
    filteredCalendarEvents,
    filteredGithubItems,
    filteredGmailItems,
    filteredSlackMessages,
    filteredLinearItems,
    selectedCategory
  ]);

  // Select a message from suggestions
  const selectMessage = async (message: MessageTag) => {
    setIsSearching(true);
    
    try {
      let messageContent = '';
      
      try {
        const messageId = message.id.replace('message-', '');
        const response = await window.electron.invoke(MessageEvents.GET_CONVERSATION_MESSAGES, message.conversationId, messageId);
        
        if (response.success && response.data?.length > 0) {
          const messageData = response.data[0];
          messageContent = messageData.content;
        } else {
          messageContent = `[Error loading message content]`;
        }
      } catch (error) {
        messageContent = `[Error loading message content: ${error instanceof Error ? error.message : String(error)}]`;
      }
      
      // Add reference as needed
      // You could store message references similar to file references if needed
      
    } catch (error) {
      console.error("Error selecting message:", error);
    } finally {
      setShowSuggestions(false);
      setIsSearching(false);
    }
  };
  
  // Move contentCategories after selectMessage is defined
  const contentCategories = [
    { 
      id: 'files', 
      title: 'Files',
      icon: <File className="w-4 h-4 text-white/60" />,
      items: filteredFiles,
      emptyLabel: 'No matching files found',
      renderItem: (file: FileTag) => (
        <div className="flex w-full">
          <div className="flex-shrink-0 mr-2.5">
            <File className="w-4 h-4 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium text-white/90 truncate">{file.name}</span>
            </div>
            <span className="text-xs text-white/40 truncate max-w-[300px] block">{file.path}</span>
          </div>
        </div>
      ),
      onSelect: selectFile
    },
    { 
      id: 'messages', 
      title: 'Messages',
      icon: <MessageSquare className="w-4 h-4 text-white/60" />,
      items: filteredMessages,
      emptyLabel: 'No matching messages found',
      renderItem: (message: MessageTag) => (
        <div className="flex w-full">
          <div className="flex-shrink-0 mr-2.5">
            <MessageSquare className={`w-4 h-4 ${message.role === 'assistant' ? 'text-cyan-400' : 'text-white/60'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white/90 truncate max-w-[300px]">{message.name}</span>
              <span className="text-xs text-white/40">From: {message.conversationTitle}</span>
            </div>
          </div>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-white/[0.05] text-white/60">
            {message.role === 'assistant' ? 'AI' : 'User'}
          </span>
        </div>
      ),
      onSelect: selectMessage
    },
    { 
      id: 'calendar', 
      title: 'Calendar',
      icon: <Calendar className="w-4 h-4 text-white/60" />,
      items: filteredCalendarEvents,
      emptyLabel: 'No calendar events found',
      renderItem: (event: CalendarEvent) => (
        <div className="flex w-full">
          <div className="flex-shrink-0 mr-2.5">
            <Calendar className="w-4 h-4 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium text-white/90 truncate">{event.title}</span>
              <span className="text-xs bg-white/[0.08] px-1.5 py-0.5 rounded text-white/60">
                {event.time}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 truncate max-w-[200px] block">{event.date}</span>
              {event.attendees && (
                <span className="text-xs text-white/40">{event.attendees} attendees</span>
              )}
            </div>
          </div>
        </div>
      ),
      onSelect: (event: CalendarEvent) => {
        toast({
          title: "Calendar Event Selected",
          description: `Added reference to "${event.title}"`,
          variant: "default",
        });
        setShowSuggestions(false);
      }
    },
    { 
      id: 'github', 
      title: 'GitHub',
      icon: <Github className="w-4 h-4 text-white/60" />,
      items: filteredGithubItems,
      emptyLabel: 'No GitHub repositories found',
      renderItem: (item: GithubItem) => (
        <div className="flex w-full">
          <div className="flex-shrink-0 mr-2.5">
            <Github className="w-4 h-4 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium text-white/90 truncate">{item.name}</span>
              <span className="text-xs bg-white/[0.08] px-1.5 py-0.5 rounded text-white/60">
                {item.type}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 truncate max-w-[200px] block">
                {item.owner}/{item.type === 'repository' ? item.name : '...'}
              </span>
              {item.description && (
                <span className="text-xs text-white/40 truncate max-w-[120px]">{item.description}</span>
              )}
            </div>
          </div>
        </div>
      ),
      onSelect: (item: GithubItem) => {
        toast({
          title: "GitHub Item Selected",
          description: `Added reference to ${item.type} "${item.name}"`,
          variant: "default",
        });
        setShowSuggestions(false);
      }
    },
    { 
      id: 'gmail', 
      title: 'Gmail',
      icon: <Mail className="w-4 h-4 text-white/60" />,
      items: filteredGmailItems,
      emptyLabel: 'No Gmail messages found',
      renderItem: (message: GmailItem) => (
        <div className="flex w-full">
          <div className="flex-shrink-0 mr-2.5">
            <Mail className={`w-4 h-4 ${message.isUnread ? 'text-cyan-400' : 'text-white/60'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className={`text-sm font-medium truncate ${message.isUnread ? 'text-white/90' : 'text-white/80'}`}>
                {message.subject}
              </span>
              <span className="text-xs text-white/40">{message.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">{message.sender}</span>
            </div>
            <span className="text-xs text-white/40 line-clamp-1">{message.preview}</span>
          </div>
          {message.isUnread && (
            <span className="ml-2 w-2 h-2 rounded-full bg-cyan-400 self-center"></span>
          )}
        </div>
      ),
      onSelect: (message: GmailItem) => {
        toast({
          title: "Gmail Message Selected",
          description: `Added reference to email "${message.subject}"`,
          variant: "default",
        });
        setShowSuggestions(false);
      }
    },
    { 
      id: 'slack', 
      title: 'Slack',
      icon: <Hash className="w-4 h-4 text-white/60" />,
      items: filteredSlackMessages,
      emptyLabel: 'No Slack messages found',
      renderItem: (message: SlackMessage) => (
        <div className="flex w-full">
          <div className="flex-shrink-0 mr-2.5">
            <Hash className="w-4 h-4 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-white/50 text-xs">
                <span className="font-medium text-white/70">{message.sender}</span> in 
                <span className="text-cyan-400 ml-1">#{message.channel}</span>
              </span>
              <span className="text-xs text-white/40">{message.timestamp}</span>
            </div>
            <div className="text-sm font-medium text-white/90 mb-0.5 line-clamp-2">
              {message.content}
            </div>
            {message.hasThread && (
              <div className="flex items-center text-xs text-white/50">
                <svg className="w-3 h-3 mr-1 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
              </div>
            )}
          </div>
        </div>
      ),
      onSelect: (message: SlackMessage) => {
        toast({
          title: "Slack Message Selected",
          description: `Added reference to message from ${message.sender} in #${message.channel}`,
          variant: "default",
        });
        setShowSuggestions(false);
      }
    },
    { 
      id: 'linear', 
      title: 'Linear',
      icon: <CheckSquare className="w-4 h-4 text-white/60" />,
      items: filteredLinearItems,
      emptyLabel: 'No Linear items found',
      renderItem: (item: LinearItem) => (
        <div className="flex w-full">
          <div className="flex-shrink-0 mr-2.5">
            <CheckSquare className="w-4 h-4 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium text-white/90 truncate">{item.title}</span>
              <div className="flex items-center gap-1">
                {item.priority && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-sm ${
                    item.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    item.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {item.priority}
                  </span>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded-sm ${
                  item.status === 'todo' ? 'bg-white/10 text-white/60' :
                  item.status === 'inProgress' ? 'bg-blue-500/20 text-blue-400' :
                  item.status === 'done' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {item.status === 'inProgress' ? 'in progress' : item.status}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">{item.team} • {item.type}</span>
              {item.assignee && (
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/60">
                  {item.assignee}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
      onSelect: (item: LinearItem) => {
        toast({
          title: "Linear Item Selected",
          description: `Added reference to ${item.type} "${item.title}"`,
          variant: "default",
        });
        setShowSuggestions(false);
      }
    }
  ];

  const handleStickToBottomChange = useCallback((isAtBottom: boolean) => {
    setIsStickToBottom(isAtBottom);
  }, []);

  const scrollToBottomHandler = useRef<() => void>(() => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  });

  const handleScrollToBottom = useCallback((callback: () => void) => {
    scrollToBottomHandler.current = callback;
  }, []);

  const handleCreateConversation = async (title: string = 'New Conversation') => {
    if (!activeSpace?.id) {
      toast({
        title: 'Error',
        description: 'Please select a space first',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createConversation(activeSpace.id, title);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      await setActiveConversation(conversation);
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to select conversation',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-full w-full">
      <div className="fixed top-4 right-4 z-50">
        {user && <UserProfileDropdown user={user} />}
      </div>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div
          className="relative p-1 rounded-full command-glass-effect">
          <div className="flex items-center divide-x divide-white/[0.08]">
            <div className="px-1 first:pl-1 last:pr-1">
              <SpaceTab activeSpace={activeSpace} />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ModelTab space={activeSpace} />
            </div>
            <div className="px-1 first:pl-1 last:pr-1">
              <ChatModeTab space={activeSpace} />
            </div>
            {!isStickToBottom && messages.length > 0 && (
              <div className="px-1 first:pl-1 last:pr-1">
                <BaseTab
                  icon={<ArrowDown className="w-3 h-3" />}
                  label="Scroll to Bottom"
                  onClick={() => {
                    scrollToBottomHandler.current();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 w-full h-full flex flex-col">
        <ChatMessages
          messages={messages}
          onStickToBottomChange={handleStickToBottomChange}
          onScrollToBottom={handleScrollToBottom}
          ref={messagesContainerRef}
          isLoading={status !== 'ready' || isSpaceLoading}
          streamData={data}
        />
        <div className="fixed left-1/2 bottom-8 -translate-x-1/2 w-[800px] z-50">
          <div className="relative w-full">
            {showSuggestions && (
              <div 
                className="absolute bottom-full left-0 right-0 z-[100] mb-4 file-suggestions-menu"
                style={{ display: showSuggestions ? 'block' : 'none' }}
              >
                <div className="max-h-[480px] w-full overflow-hidden rounded-md border border-white/10 bg-black/90 backdrop-blur-xl shadow-xl">
                  <div className="flex-shrink-0 pt-2">
                    <div className="px-3 py-1.5 flex justify-between items-center text-xs text-white/50">
                      <span className="text-xs uppercase tracking-wider text-white/40 font-medium">
                        @ Mentions
                      </span>
                      {suggestionQuery && (
                        <span>
                          {hasAnyResults
                            ? `Found ${filteredFiles.length + filteredMessages.length} match${filteredFiles.length + filteredMessages.length === 1 ? '' : 'es'}`
                            : 'No matches found'}
                        </span>
                      )}
                    </div>
                    
                    {/* Category Tabs */}
                    <div className="px-3 pt-1.5 pb-2">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {contentCategories.map(category => (
                          <button
                            key={category.id}
                            onClick={() => handleSelectCategory(category.id)}
                            className={`flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[70px]
                              ${selectedCategory === category.id 
                                ? 'bg-white/10 text-white/90' 
                                : 'bg-transparent text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
                              }`}
                          >
                            <span className="w-4 h-4 mr-1.5">{category.icon}</span>
                            <span className="truncate">{category.title}</span>
                            {category.items.length > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/60 text-xs min-w-[20px] text-center">
                                {category.items.length}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="h-[1px] w-full bg-white/10 my-1.5"></div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto max-h-[340px] py-2 px-0 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
                        <span className="ml-2 text-white/60">Searching...</span>
                      </div>
                    ) : !hasAnyResults ? (
                      <div className="text-sm text-white/50 flex flex-col items-center py-4">
                        <Search className="w-8 h-8 text-white/20 mb-2" />
                        <p>{suggestionQuery.trim() ? 'No results found' : 'Select a category or type to search'}</p>
                        {suggestionQuery.trim() && (
                          <span className="text-xs text-white/40 mt-1">Try a different search term</span>
                        )}
                      </div>
                    ) : (
                      <div role="menu">
                        {contentCategories
                          .filter(category => 
                            // If a category is selected, only show that one
                            !selectedCategory || selectedCategory === category.id
                          )
                          .map(category => {
                            // Skip categories with no items
                            if (!category.items || category.items.length === 0) return null;
                            
                            return (
                              <div key={category.id} className="mb-3">
                                <div className="px-3 mb-1 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/40 font-medium">
                                    {category.icon}
                                    <span>{category.title}</span>
                                  </div>
                                </div>
                                <div className="px-0.5 space-y-0.5">
                                  {category.items.map((item: any) => (
                                    <div
                                      key={item.id}
                                      className="flex items-start py-2 px-3 cursor-pointer mx-1.5 rounded-md transition-all duration-150 hover:bg-white/[0.04]"
                                      onClick={() => category.onSelect(item)}
                                      role="menuitem"
                                      tabIndex={0}
                                    >
                                      {category.renderItem(item)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <UnifiedInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              disabled={!activeSpace || !activeConversation || status !== 'ready'}
              externalFileReferences={fileReferences}
              onFileReferencesChange={setFileReferences}
              onSuggestionQueryChange={handleSuggestionQueryChange}
              onSelectFile={selectFile}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
            >
              <div className="flex items-center divide-x divide-white/[0.05]">
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
                  <ActionsTab onCreateConversation={handleCreateConversation} />
                </div>
                <div className="px-1 first:pl-2 last:pr-2 py-1 w-1/5 min-w-0 max-w-1/5 flex-shrink-0">
                  <MessagesTab
                    messages={messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
                      id: m.id || '',
                      content: typeof m.content === 'string' ? m.content : '',
                      role: m.role as 'user' | 'assistant',
                      timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
                      annotations: m.annotations || []
                    }))}
                    conversationId={activeConversation?.id}
                    conversationName={activeConversation?.title}
                    spaceId={activeSpace?.id}
                    spaceName={activeSpace?.name}
                    onCommandWindowToggle={(mode) => handleCommandWindowToggle(mode as any)}
                    onMessageSearch={(query, searchScope) => {
                      if (searchScope === 'space') {
                        toast({
                          title: "Space Search",
                          description: `Searching entire space for "${query}"`,
                          variant: "default",
                        });
                      } else {
                        handleCommandWindowToggle('messageSearch');
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
                    onCreateConversation={handleCreateConversation}
                    onSelectConversation={handleSelectConversation}
                    activeConversation={activeConversation}
                  />
                </div>
              </div>
            </UnifiedInput>
          </div>
        </div>
      </div>
    </div>
  );
}