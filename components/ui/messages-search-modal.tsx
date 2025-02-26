'use client';

import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { SearchIcon, MessageSquare, Layers, Sparkles, Hash, ArrowUpRight } from 'lucide-react';
import { useSpaceStore } from '@/lib/stores/space-store';
import { useConversationStore } from '@/lib/stores/conversation-store';
import { useMessagesSearchStore, SearchScope, SearchMode } from '@/lib/stores/messages-search-store';
import { cn } from '@/lib/utils';
import { Conversation, Message } from '@/types';
import { useRouter } from 'next/navigation';
import { searchMessages } from '@/app/actions';

// Helper function to format relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}y ago`;
};

interface MessagesSearchResult {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  conversationId: string;
  conversationTitle: string;
  score?: number;
}

interface MessagesSearchProps {
  isOpen: boolean;
  onClose: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function MessagesSearchModal({
  isOpen,
  onClose,
  searchValue,
  onSearchChange,
}: MessagesSearchProps) {
  const router = useRouter();
  const { activeSpace } = useSpaceStore();
  const { activeConversation, conversations, setActiveConversationId } = useConversationStore();
  const {
    searchScope,
    searchMode,
    setSearchScope,
    setSearchMode,
    isSearching,
    setIsSearching
  } = useMessagesSearchStore();
  
  const [searchResults, setSearchResults] = useState<MessagesSearchResult[]>([]);
  
  // Perform the search whenever search parameters change
  useEffect(() => {
    if (!searchValue || searchValue.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    // Set search in progress
    setIsSearching(true);
    
    let isMounted = true;
    
    const performSearch = async () => {
      try {
        // Use the server action to search messages
        const result = await searchMessages(
          searchValue,
          searchScope,
          searchMode,
          searchScope === 'conversation' ? activeConversation?.id : undefined,
          searchScope === 'space' ? activeSpace?.id : undefined,
          50
        );
        
        if (isMounted) {
          setSearchResults(result.results || []);
        }
      } catch (error) {
        console.error('Error searching messages:', error);
        if (isMounted) {
          setSearchResults([]);
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };
    
    performSearch();
    
    // Clean up function to handle component unmounting
    return () => {
      isMounted = false;
    };
  }, [
    searchValue, 
    searchScope, 
    searchMode, 
    activeConversation, 
    activeSpace,
    setIsSearching
  ]);
  
  // Handle navigation to a specific message
  const navigateToMessage = (message: MessagesSearchResult) => {
    // Navigate to the conversation containing the message
    if (message.conversationId) {
      setActiveConversationId(message.conversationId);
      
      // Navigate to the conversation route with the messageId as a query parameter
      router.push(`/conversation/${message.conversationId}?messageId=${message.id}`);
      onClose();
    }
  };
  
  // Highlight matching text in search results (for keyword search)
  const highlightMatchingText = (content: string, searchTerm: string) => {
    if (!searchTerm || searchMode === 'semantic') return content;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = content.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <span key={i} className="bg-cyan-800/60 text-cyan-100 px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };
  
  return (
    <div className="space-y-4 pb-2">
      {/* Header with title and search configuration */}
      <div className="px-3 py-2 flex flex-col gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex justify-between items-center">
          <div className="text-lg text-white/90 font-semibold flex items-center gap-2">
            <SearchIcon className="w-5 h-5 text-white/70" />
            Search Messages
          </div>
        </div>
        
        {/* Search configuration options */}
        <div className="flex flex-wrap gap-3 mt-1">
          {/* Scope selector */}
          <div className="flex h-9 items-center rounded-lg bg-black/50 border border-white/10 p-1 shadow-inner shadow-black/20">
            <button 
              className={cn(
                "px-3 h-7 text-xs rounded-md transition-all flex items-center gap-1.5",
                searchScope === 'conversation' 
                  ? "bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 text-white shadow-sm border border-white/10" 
                  : "text-white/70 hover:text-white/90 hover:bg-white/5"
              )}
              onClick={() => setSearchScope('conversation')}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Conversation
            </button>
            <button 
              className={cn(
                "px-3 h-7 text-xs rounded-md transition-all flex items-center gap-1.5",
                searchScope === 'space' 
                  ? "bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 text-white shadow-sm border border-white/10" 
                  : "text-white/70 hover:text-white/90 hover:bg-white/5"
              )}
              onClick={() => setSearchScope('space')}
            >
              <Layers className="w-3.5 h-3.5" />
              Space
            </button>
          </div>
          
          {/* Search mode toggle */}
          <div className="flex h-9 items-center rounded-lg bg-black/50 border border-white/10 p-1 shadow-inner shadow-black/20">
            <button 
              className={cn(
                "px-3 h-7 text-xs rounded-md transition-all flex items-center gap-1.5",
                searchMode === 'keyword' 
                  ? "bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 text-white shadow-sm border border-white/10" 
                  : "text-white/70 hover:text-white/90 hover:bg-white/5"
              )}
              onClick={() => setSearchMode('keyword')}
            >
              <Hash className="w-3.5 h-3.5" />
              Keyword
            </button>
            <button 
              className={cn(
                "px-3 h-7 text-xs rounded-md transition-all flex items-center gap-1.5",
                searchMode === 'semantic' 
                  ? "bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 text-white shadow-sm border border-white/10" 
                  : "text-white/70 hover:text-white/90 hover:bg-white/5"
              )}
              onClick={() => setSearchMode('semantic')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Semantic
            </button>
          </div>
        </div>
      </div>
      
      {/* Search context information */}
      <div className="px-4 py-1">
        <p className="text-xs text-white/50">
          {searchScope === 'conversation' 
            ? 'Searching in current conversation' 
            : 'Searching across all conversations in this space'}
          {searchMode === 'semantic' && ' using AI-powered semantic search'}
        </p>
      </div>
      
      {/* Search results or empty state */}
      {isSearching ? (
        <div className="py-12 text-center flex flex-col items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center mb-4">
              <SearchIcon className="w-7 h-7 text-cyan-400/70" />
            </div>
            <p className="text-base text-white/80 font-medium">Searching messages...</p>
            <p className="text-xs text-white/50 mt-2">This may take a moment</p>
          </div>
        </div>
      ) : searchValue.length < 2 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 flex items-center justify-center mb-4">
            <SearchIcon className="w-7 h-7 text-cyan-400/50" />
          </div>
          <p className="text-base text-white/80 font-medium">Search for messages</p>
          <p className="text-xs text-white/50 mt-2 max-w-md mx-auto">
            Type at least 2 characters to search for messages
            {searchScope === 'conversation' ? ' in this conversation' : ' across this space'}
          </p>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center mb-4">
            <SearchIcon className="w-7 h-7 text-orange-400/50" />
          </div>
          <p className="text-base text-white/80 font-medium">No matching messages found</p>
          <p className="text-xs text-white/50 mt-2 max-w-md mx-auto">
            {`We couldn't find any messages containing "${searchValue}" `}
            {searchScope === 'conversation' ? 'in this conversation' : 'across this space'}
            {searchMode === 'semantic' ? ' using semantic search' : ''}
          </p>
          <div className="mt-4 flex gap-2">
            <button 
              onClick={() => searchMode === 'keyword' ? setSearchMode('semantic') : setSearchMode('keyword')}
              className="text-xs px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 transition-colors flex items-center gap-1.5"
            >
              {searchMode === 'keyword' ? <Sparkles className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
              Try {searchMode === 'keyword' ? 'semantic' : 'keyword'} search
            </button>
            {searchScope === 'conversation' && (
              <button 
                onClick={() => setSearchScope('space')}
                className="text-xs px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Search entire space
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2 px-2.5">
          <div className="text-xs font-medium text-white/50 px-1 pb-1">
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </div>
          
          {searchResults.map((message) => (
            <div
              key={message.id}
              onClick={() => navigateToMessage(message)}
              className="group p-3 rounded-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.01] to-white/[0.05]
                hover:from-white/[0.05] hover:to-white/[0.10] hover:border-white/20 
                transition-all duration-200 cursor-pointer shadow-sm"
            >
              <div className="flex items-start gap-3 w-full">
                <div className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center",
                  message.role === 'user' 
                    ? "bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 text-cyan-400" 
                    : "bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 text-indigo-400"
                )}>
                  {message.role === 'user' ? (
                    <MessageSquare className="w-4.5 h-4.5" />
                  ) : (
                    <Sparkles className="w-4.5 h-4.5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium text-sm text-white/90">
                      {message.role === 'user' ? 'User' : 'Assistant'}
                    </div>
                    <div className="text-white/40 text-xs">
                      <span className="truncate">{message.conversationTitle}</span> · {formatRelativeTime(message.createdAt)}
                    </div>
                    {message.score && (
                      <div className="ml-auto flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/30 to-cyan-600/30 text-cyan-200 font-medium border border-cyan-500/20">
                        {Math.round(message.score * 100)}% match
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-white/80 line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                    {searchMode === 'keyword' 
                      ? highlightMatchingText(message.content, searchValue)
                      : message.content}
                  </div>
                  
                  <div className="mt-1.5 flex justify-end">
                    <div className="text-xs text-cyan-400/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                      View in conversation
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
