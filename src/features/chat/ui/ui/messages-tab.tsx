import { useState, useMemo } from 'react';
import { Search, MessageSquare, Code, FileText, SlidersHorizontal, Globe, Sparkles, Filter, XCircle, Copy, ExternalLink, Pencil } from 'lucide-react';
import { BaseTab } from 'shared/components/base-tab';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from 'shared/components/dropdown-menu';
import { Button } from 'shared/components/button';
import { toast } from 'shared/hooks/use-toast';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from 'shared/components/shared/dropdown-list';
import { formatDistanceToNow } from 'date-fns';

export interface MessagesTabProps {
  messages?: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp?: Date;
    annotations?: any[];
  }>;
  spaceId?: string;
  spaceName?: string;
  conversationId?: string;
  conversationName?: string;
  onMessageSearch?: (query: string, searchScope: 'conversation' | 'space') => void;
  onCommandWindowToggle?: (mode: string) => void;
  onClick?: () => void;
}

export function MessagesTab({ 
  messages = [], 
  spaceId,
  spaceName,
  conversationId,
  conversationName,
  onMessageSearch, 
  onCommandWindowToggle,
  onClick 
}: MessagesTabProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchScope, setSearchScope] = useState<'conversation' | 'space'>('conversation');
  const [filterType, setFilterType] = useState<'all' | 'code' | 'user' | 'ai'>('all');
  
  // Filter messages based on search query and filter type
  const filteredMessages = useMemo(() => {
    if (searchScope !== 'conversation') return [];
    
    let filtered = messages;
    
    // Apply text search if query exists
    if (searchQuery.trim()) {
      filtered = filtered.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }
    
    // Apply type filter
    switch (filterType) {
      case 'code':
        filtered = filtered.filter(msg => msg.content.includes('```'));
        break;
      case 'user':
        filtered = filtered.filter(msg => msg.role === 'user');
        break;
      case 'ai':
        filtered = filtered.filter(msg => msg.role === 'assistant');
        break;
      default:
        // 'all' - no filtering
        break;
    }
    
    return filtered;
  }, [messages, searchQuery, searchScope, filterType]);
  
  // Handle search across space
  const handleSearch = () => {
    if (searchQuery.trim() && onMessageSearch) {
      onMessageSearch(searchQuery, searchScope);
      
      toast({
        title: `Searching ${searchScope === 'space' ? spaceName || 'Entire Space' : conversationName || 'Conversation'}`,
        description: `Searching for "${searchQuery}"`,
        variant: "default",
      });
      
      // Close the dropdown if searching in space
      if (searchScope === 'space' && onClick) {
        onClick();
      }
    }
  };
  
  // Handle message selection
  const handleMessageSelect = (messageId: string) => {
    setSelectedMessageId(messageId);
    
    toast({
      title: "Message Selected",
      description: "Scrolled to selected message",
      variant: "default",
    });
    
    // Close dropdown after selection
    if (onClick) {
      onClick();
    }
  };
  
  // Format message content preview
  const getMessagePreview = (content: string) => {
    // Remove code blocks
    let preview = content.replace(/```[\s\S]*?```/g, '[Code Block]');
    // Remove markdown
    preview = preview.replace(/\*\*(.*?)\*\*/g, '$1');
    preview = preview.replace(/\*(.*?)\*/g, '$1');
    // Truncate
    return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
  };
  
  // Get message icon based on content and role
  const getMessageIcon = (message: any) => {
    if (message.role === 'user') {
      return <MessageSquare className="w-4 h-4 text-blue-400" />;
    }
    
    if (message.content.includes('```')) {
      return <Code className="w-4 h-4 text-green-400" />;
    }
    
    if (message.annotations?.some((a: any) => a.type === 'file_reference')) {
      return <FileText className="w-4 h-4 text-orange-400" />; 
    }
    
    return <Sparkles className="w-4 h-4 text-purple-400" />;
  };
  
  // Dropdown section for messages
  const messageSection: DropdownSection = {
    title: `Messages ${filteredMessages.length > 0 ? `(${filteredMessages.length})` : ''}`,
    items: filteredMessages.map(message => ({
      id: message.id,
      isActive: selectedMessageId === message.id,
      onSelect: () => handleMessageSelect(message.id),
      content: (
        <div className="flex w-full">
          <div className="flex-shrink-0 mr-2.5 mt-0.5">
            {getMessageIcon(message)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium text-white/90 truncate">
                {message.role === 'user' ? 'You' : 'AI'}
              </span>
              {message.timestamp && !isNaN(message.timestamp.getTime()) && (
                <span className="text-xs text-white/50">
                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                </span>
              )}
            </div>
            <span className="text-xs text-white/60 line-clamp-2 w-full">
              {getMessagePreview(message.content)}
            </span>
          </div>
        </div>
      )
    }))
  };
  
  // Get footer actions based on selected message
  const getFooterActions = (): DropdownFooterAction[] => {
    // If in space scope, show space search action
    if (searchScope === 'space') {
      return [
        {
          icon: <Search className="w-3.5 h-3.5" />,
          label: `Search ${spaceName || 'All Chats'}`,
          onClick: () => handleSearch(),
          isDisabled: !searchQuery.trim()
        }
      ];
    }
    
    // Return message-specific actions for conversation scope
    return [
      {
        icon: <Copy className="w-3.5 h-3.5" />,
        label: "Copy message",
        onClick: (messageId) => {
          const selectedMessage = messages.find(msg => msg.id === messageId);
          if (selectedMessage) {
            const hasCode = selectedMessage.content.includes('```');
            const content = hasCode 
              ? selectedMessage.content.match(/```(?:\w*\n)?([\s\S]*?)```/)?.[1] || selectedMessage.content
              : selectedMessage.content;
              
            navigator.clipboard.writeText(content);
            toast({
              title: "Copied to clipboard",
              description: hasCode ? "Code copied to clipboard" : "Message copied to clipboard",
              variant: "default",
            });
          }
        }
      },
      {
        icon: <MessageSquare className="w-3.5 h-3.5" />,
        label: "Add to conversation",
        onClick: (messageId) => {
          const selectedMessage = messages.find(msg => msg.id === messageId);
          if (selectedMessage) {
            toast({
              title: "Message added",
              description: "Message added to current conversation",
              variant: "default",
            });
            // Here you would implement the actual add to conversation logic
          }
        }
      }
    ];
  };
  
  // Calculate filter summary for display
  const getFilterSummary = () => {
    if (filterType === 'all' && !searchQuery) return null;
    
    const parts = [];
    if (filterType !== 'all') {
      parts.push(filterType === 'code' ? 'Code blocks' : 
                filterType === 'user' ? 'Your messages' : 'AI messages');
    }
    
    if (searchQuery) {
      parts.push(`"${searchQuery}"`);
    }
    
    return parts.join(' with ');
  };
  
  const filterSummary = getFilterSummary();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="transparent" 
          className="p-0 h-auto rounded-sm transition-all duration-200 group w-full"
          aria-label="Search messages"
        >
          <BaseTab
            icon={
              <div className="flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform duration-300">
                <Search className="w-3 h-3" />
              </div>
            }
            label="Messages"
            shortcut="F"
            className="w-full"
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownList 
        headerContent={
          <div className="px-2 pt-2 pb-2">
            {/* Scope toggle */}
            <div className="flex mb-2.5 bg-white/[0.03] rounded-md p-0.5">
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-all duration-200 ${
                  searchScope === 'conversation' 
                    ? 'bg-white/10 text-white/90 font-medium shadow-sm' 
                    : 'text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
                }`}
                onClick={() => setSearchScope('conversation')}
                aria-label={`Search in ${conversationName || 'current conversation'}`}
              >
                <MessageSquare className="w-3 h-3" />
                <span className="truncate">{conversationName || 'This Chat'}</span>
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-all duration-200 ${
                  searchScope === 'space' 
                    ? 'bg-white/10 text-white/90 font-medium shadow-sm' 
                    : 'text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
                }`}
                onClick={() => setSearchScope('space')}
                aria-label={`Search in ${spaceName || 'entire space'}`}
              >
                <Globe className="w-3 h-3" />
                <span className="truncate">{spaceName || 'All Chats'}</span>
              </button>
            </div>
            
            {/* Search input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-white/40" />
              </div>
              <input
                type="text"
                placeholder={`Search ${searchScope === 'conversation' ? (conversationName || 'this chat') : (spaceName || 'all chats')}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchScope === 'space') {
                      handleSearch();
                    } else if (filteredMessages.length > 0) {
                      handleMessageSelect(filteredMessages[0].id);
                    }
                  }
                }}
                className="w-full bg-white/[0.05] rounded-md py-1.5 pl-8 pr-3 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.07]"
                aria-label={`Search ${searchScope === 'conversation' ? 'this chat' : 'all chats'}`}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 flex items-center text-white/40 hover:text-white/60"
                >
                  <span className="sr-only">Clear search</span>
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            {/* Filters - only show in conversation scope */}
            {searchScope === 'conversation' && (
              <div className="mt-2.5 flex space-x-1.5">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 flex-1 justify-center transition-all ${
                    filterType === 'all' 
                      ? 'bg-white/10 text-white/90' 
                      : 'bg-white/[0.03] hover:bg-white/[0.05] text-white/60'
                  }`}
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  All
                </button>
                <button
                  onClick={() => setFilterType('code')}
                  className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 flex-1 justify-center transition-all ${
                    filterType === 'code' 
                      ? 'bg-white/10 text-white/90' 
                      : 'bg-white/[0.03] hover:bg-white/[0.05] text-white/60'
                  }`}
                >
                  <Code className="w-2.5 h-2.5" />
                  Code
                </button>
                <button
                  onClick={() => setFilterType('user')}
                  className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 flex-1 justify-center transition-all ${
                    filterType === 'user' 
                      ? 'bg-white/10 text-white/90' 
                      : 'bg-white/[0.03] hover:bg-white/[0.05] text-white/60'
                  }`}
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  You
                </button>
                <button
                  onClick={() => setFilterType('ai')}
                  className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 flex-1 justify-center transition-all ${
                    filterType === 'ai' 
                      ? 'bg-white/10 text-white/90' 
                      : 'bg-white/[0.03] hover:bg-white/[0.05] text-white/60'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  AI
                </button>
              </div>
            )}
            
            {/* Search results summary */}
            {(searchScope === 'conversation' && (searchQuery || filterType !== 'all')) && (
              <div className="flex justify-between items-center text-xs text-white/50 mt-2 px-1">
                {filterSummary && (
                  <div className="flex items-center">
                    <Filter className="w-3 h-3 mr-1" />
                    <span>Filtering: {filterSummary}</span>
                  </div>
                )}
                <span className="ml-auto">
                  {filteredMessages.length === 0 
                    ? 'No matches' 
                    : `${filteredMessages.length} match${filteredMessages.length === 1 ? '' : 'es'}`}
                </span>
              </div>
            )}
            
            {/* Space search instruction */}
            {searchScope === 'space' && (
              <div className="flex items-center text-xs text-white/50 mt-2 px-1">
                <Globe className="w-3 h-3 mr-1" />
                <span>Press Enter to search across all chats</span>
              </div>
            )}
          </div>
        }
        sections={searchScope === 'conversation' && filteredMessages.length > 0 ? [messageSection] : []}
        footerActions={getFooterActions()}
        emptyState={
          <div className="text-sm text-white/50 flex flex-col items-center justify-center py-8">
            {searchScope === 'space' ? (
              <>
                <Globe className="w-8 h-8 text-white/20 mb-3" />
                <p className="mb-1">Search across all chats</p>
                <p className="text-xs text-white/40 max-w-[220px] text-center">
                  Type your search and press Enter to find messages in this space
                </p>
                {searchQuery && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 text-xs" 
                    onClick={() => handleSearch()}
                  >
                    <Search className="w-3 h-3 mr-1.5" />
                    Search "{searchQuery}"
                  </Button>
                )}
              </>
            ) : searchQuery || filterType !== 'all' ? (
              <>
                <Filter className="w-8 h-8 text-white/20 mb-3" />
                <p className="mb-1">No messages match your filters</p>
                <div className="flex space-x-2 mt-4">
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs" 
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </Button>
                  )}
                  {filterType !== 'all' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs" 
                      onClick={() => setFilterType('all')}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </>
            ) : messages.length === 0 ? (
              <>
                <MessageSquare className="w-8 h-8 text-white/20 mb-3" />
                <p>No messages in this conversation</p>
              </>
            ) : (
              <>
                <Search className="w-8 h-8 text-white/20 mb-3" />
                <p className="mb-1">Search this conversation</p>
                <p className="text-xs text-white/40 max-w-[220px] text-center">
                  Type to search or select a filter to find specific messages
                </p>
              </>
            )}
          </div>
        }
      />
    </DropdownMenu>
  );
} 