import { create } from 'zustand';

export type SearchScope = 'conversation' | 'space';
export type SearchMode = 'keyword' | 'semantic';

interface MessagesSearchState {
  // Search configuration
  searchTerm: string;
  searchScope: SearchScope;
  searchMode: SearchMode;
  
  // Search results
  isSearching: boolean;
  
  // Actions
  setSearchTerm: (term: string) => void;
  setSearchScope: (scope: SearchScope) => void;
  setSearchMode: (mode: SearchMode) => void;
  setIsSearching: (isSearching: boolean) => void;
  resetSearch: () => void;
}

export const useMessagesSearchStore = create<MessagesSearchState>((set) => ({
  // Default state
  searchTerm: '',
  searchScope: 'conversation',
  searchMode: 'keyword',
  isSearching: false,
  
  // Actions
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSearchScope: (scope) => set({ searchScope: scope }),
  setSearchMode: (mode) => set({ searchMode: mode }),
  setIsSearching: (isSearching) => set({ isSearching }),
  resetSearch: () => set({
    searchTerm: '',
    isSearching: false,
  }),
}));
