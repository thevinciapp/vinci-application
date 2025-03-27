import { useState } from 'react';
import { Search, Clock, MessageSquare, Code, FileText, SlidersHorizontal, Globe } from 'lucide-react';
import { BaseTab } from '@/components/ui/base-tab';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from '@/components/shared/dropdown-list';
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
  
  // Filter messages based on search query (only applies to conversation scope)
  const filteredMessages = searchQuery.trim() && searchScope === 'conversation'
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : searchScope === 'conversation' ? messages : [];
  
  // Handle search across entire space
  const handleSearch = () => {
    if (searchQuery.trim() && onMessageSearch) {
      onMessageSearch(searchQuery, searchScope);
      
      // Provide feedback based on search scope
      toast({
        title: `Searching ${searchScope === 'space' ? 'Entire Space' : 'Conversation'}`,
        description: `Searching for "${searchQuery}"`,
        variant: "default",
      });
      
      // Close the dropdown if searching in space
      if (searchScope === 'space' && onClick) {
        onClick();
      }
    }
  };
  
  // Handle toggle scope change
  const toggleSearchScope = () => {
    setSearchScope(prev => prev === 'conversation' ? 'space' : 'conversation');
    // Clear filtered results when toggling to space search
    if (searchScope === 'conversation' && searchQuery) {
      setSearchQuery('');
    }
  };
  
  // Simulate message jump
  const handleMessageSelect = (messageId: string) => {
    setSelectedMessageId(messageId);
    // Simulate scrolling to message
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
  
  // Message content preview (truncate and clean)
  const getMessagePreview = (content: string) => {
    // Remove code blocks
    let preview = content.replace(/```[\s\S]*?```/g, '[Code Block]');
    // Remove markdown
    preview = preview.replace(/\*\*(.*?)\*\*/g, '$1');
    preview = preview.replace(/\*(.*?)\*/g, '$1');
    // Truncate
    return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
  };
  
  // Get appropriate icon for message based on content
  const getMessageIcon = (message: any) => {
    if (message.role === 'user') {
      return <MessageSquare className="w-4 h-4 text-blue-400" />;
    }
    
    // Check for code blocks
    if (message.content.includes('```')) {
      return <Code className="w-4 h-4 text-green-400" />;
    }
    
    // Check for file references
    if (message.annotations?.some((a: any) => a.type === 'file_reference')) {
      return <FileText className="w-4 h-4 text-orange-400" />; 
    }
    
    return <MessageSquare className="w-4 h-4 text-purple-400" />;
  };
  
  // Define message section
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
              {message.timestamp && (
                <span className="text-xs text-white/50">
                  <Clock className="w-3 h-3 inline mr-0.5 align-text-bottom" />
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
  
  // Define dropdown sections
  const dropdownSections: DropdownSection[] = 
    searchScope === 'conversation' && filteredMessages.length > 0 ? [messageSection] : [];
  
  // Define footer actions
  const footerActions: DropdownFooterAction[] = searchScope === 'space' ? [
    {
      icon: <Search className="w-3.5 h-3.5" />,
      label: `Search ${spaceName || 'Entire Space'}`,
      onClick: () => handleSearch(),
      isDisabled: !searchQuery.trim()
    }
  ] : [
    {
      icon: <Search className="w-3.5 h-3.5" />,
      label: "Advanced Search",
      onClick: () => {
        if (onCommandWindowToggle) {
          onCommandWindowToggle('messageSearch');
        }
      }
    },
    {
      icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
      label: "Sort Messages",
      onClick: () => {
        toast({
          title: "Sort Options",
          description: "Message sorting options will be available soon",
          variant: "default",
        });
      }
    }
  ];
  
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
          <div className="px-2 pt-1.5 pb-2">
            {/* Scope toggle */}
            <div className="flex justify-between mb-2">
              <button
                className={`flex-1 px-3 py-1.5 text-xs rounded-l-md ${
                  searchScope === 'conversation' 
                    ? 'bg-white/10 text-white/90 font-medium' 
                    : 'bg-white/[0.03] text-white/60 hover:bg-white/[0.05]'
                } transition-colors`}
                onClick={() => setSearchScope('conversation')}
                aria-label={`Search in ${conversationName || 'current conversation'}`}
              >
                <MessageSquare className="w-3 h-3 inline-block mr-1.5" />
                <span className="truncate">{conversationName || 'This Conversation'}</span>
              </button>
              <button
                className={`flex-1 px-3 py-1.5 text-xs rounded-r-md ${
                  searchScope === 'space' 
                    ? 'bg-white/10 text-white/90 font-medium' 
                    : 'bg-white/[0.03] text-white/60 hover:bg-white/[0.05]'
                } transition-colors`}
                onClick={() => setSearchScope('space')}
                aria-label={`Search in ${spaceName || 'entire space'}`}
              >
                <Globe className="w-3 h-3 inline-block mr-1.5" />
                <span className="truncate">{spaceName || 'Entire Space'}</span>
              </button>
            </div>
            
            {/* Search input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-white/40" />
              </div>
              <input
                type="text"
                placeholder={`Search ${searchScope === 'conversation' ? (conversationName || 'this conversation') : (spaceName || 'entire space')}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchScope === 'space') {
                    handleSearch();
                  }
                }}
                className="w-full bg-white/[0.05] rounded-md py-1.5 pl-8 pr-3 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.07]"
                aria-label={`Search ${searchScope === 'conversation' ? (conversationName || 'this conversation') : (spaceName || 'entire space')}`}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 flex items-center text-white/40 hover:text-white/60"
                >
                  <span className="sr-only">Clear search</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Search feedback */}
            {searchQuery && searchScope === 'conversation' && (
              <div className="flex justify-between items-center text-xs text-white/50 mt-1.5 px-1">
                <span>
                  {filteredMessages.length === 0 
                    ? 'No matches found' 
                    : `Found ${filteredMessages.length} match${filteredMessages.length === 1 ? '' : 'es'}`}
                </span>
              </div>
            )}
            
            {/* Space search instruction */}
            {searchScope === 'space' && (
              <div className="text-xs text-white/50 mt-1.5 px-1">
                <span>Press Enter or click "Search {spaceName || 'Entire Space'}" to begin</span>
              </div>
            )}
          </div>
        }
        sections={dropdownSections}
        footerActions={footerActions}
        emptyState={
          <div className="text-sm text-white/50 flex flex-col items-center py-4">
            <Search className="w-8 h-8 text-white/20 mb-2" />
            {searchScope === 'space' ? (
              <p>Enter search terms and press Enter to search the entire space</p>
            ) : searchQuery ? (
              <>
                <p>No messages match your search</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 text-xs" 
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              </>
            ) : (
              <p>No messages in this conversation</p>
            )}
          </div>
        }
      />
    </DropdownMenu>
  );
} 