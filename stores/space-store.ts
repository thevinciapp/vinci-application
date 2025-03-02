import { create } from 'zustand';
import { toast } from 'sonner';
import { 
  createSpace as createSpaceAction,
  updateSpace as updateSpaceAction,
  deleteSpace as deleteSpaceAction,
  getSpaces as getSpacesAction,
  getSpace as getSpaceAction,
  getSpaceData as getSpaceDataAction,
  setActiveSpace as setActiveSpaceAction,
  createConversation as createConversationAction,
  updateConversationTitle as updateConversationTitleAction,
  deleteConversation as deleteConversationAction
} from '@/app/actions';

export interface UIState {
  activeSpace: Space | null;
  conversations: Conversation[] | null;
  activeConversation: Conversation | null;
  messages: any[] | null;
  isLoading: boolean;
  loadingType: 'space' | 'conversation' | 'messages' | null;
}

export interface Space {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  model: string;
  provider: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Conversation {
  id: string;
  title?: string;
  space_id: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface SpaceData {
  space: Space | null;
  conversations: Conversation[] | null;
  messages: any[] | null;
  activeConversation: Conversation | null;
}

export interface InitialState {
  spaces?: Space[] | null;
  activeSpace?: Space | null;
  conversations?: Conversation[] | null;
  activeConversation?: Conversation | null;
  messages?: any[] | null;
  isLoading?: boolean;
  loadingType?: 'space' | 'conversation' | 'messages' | null;
}

export interface SpaceStore {
  // State
  spaces: Space[] | null;
  activeSpace: Space | null;
  conversations: Conversation[] | null;
  activeConversation: Conversation | null;
  isLoading: boolean;
  loadingSpaceId: string | null;
  loadingConversationId: string | null;
  
  // UI State for rendering components without navigation
  uiState: UIState;
  
  // Single initialization function
  initializeState: (initialState: InitialState) => void;
  
  // UI State update methods
  updateUIState: (updates: Partial<UIState>) => void;
  
  // Space fetch operations
  fetchSpaces: () => Promise<Space[] | null>;
  fetchSpace: (id: string) => Promise<Space | null>;
  fetchSpaceData: (id: string) => Promise<SpaceData | null>;
  loadSpaceFullData: (spaceId: string) => Promise<SpaceData | null>;
  
  // Space local state operations
  setSpaces: (spaces: Space[] | null) => void;
  setActiveSpace: (space: Space | null) => void;
  updateLocalSpace: (id: string, updates: Partial<Space>) => void;
  addLocalSpace: (space: Space) => void;
  removeLocalSpace: (id: string) => void;
  
  // Space server operations with optimistic updates
  createSpace: (name: string, description: string, model: string, provider: string, color?: string) => Promise<Space | null>;
  updateSpace: (id: string, updates: Partial<Space>) => Promise<boolean>;
  deleteSpace: (id: string) => Promise<boolean>;
  setActiveSpaceOnServer: (id: string) => Promise<boolean>;
  
  // Conversation state operations
  setConversations: (conversations: Conversation[] | null) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  updateLocalConversation: (id: string, updates: Partial<Conversation>) => void;
  addLocalConversation: (conversation: Conversation) => void;
  removeLocalConversation: (id: string) => void;
  
  // Conversation server operations
  createConversation: (title?: string) => Promise<Conversation | null>;
  selectConversation: (conversationId: string) => Promise<boolean>;
  updateConversation: (conversationId: string, title: string) => Promise<boolean>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  
  // Loading state
  setLoading: (isLoading: boolean) => void;
  setLoadingSpaceId: (id: string | null) => void;
  setLoadingConversationId: (id: string | null) => void;
  
  // Navigation helper (keeping for backward compatibility)
  navigateToActiveConversation: (router: any) => void;
}

export const useSpaceStore = create<SpaceStore>((set, get) => ({
  // State
  spaces: null,
  activeSpace: null,
  conversations: null,
  activeConversation: null,
  isLoading: false,
  loadingSpaceId: null,
  loadingConversationId: null,
  
  // Initialize UI state
  uiState: {
    activeSpace: null,
    conversations: null,
    activeConversation: null,
    messages: null,
    isLoading: false,
    loadingType: null
  },
  
  // Single consolidated initialization function
  initializeState: (initialState) => {
    console.log('[STORE] Initializing space store state with:', {
      hasSpaces: initialState.spaces?.length || 0,
      activeSpaceId: initialState.activeSpace?.id,
      conversationsCount: initialState.conversations?.length || 0,
      activeConversationId: initialState.activeConversation?.id,
      messagesCount: initialState.messages?.length || 0,
    });
    
    set({
      // Set main state
      spaces: initialState.spaces || null,
      activeSpace: initialState.activeSpace || null,
      conversations: initialState.conversations || null,
      activeConversation: initialState.activeConversation || null,
      isLoading: initialState.isLoading || false,
      
      // Also update UI state to match
      uiState: {
        activeSpace: initialState.activeSpace || null,
        conversations: initialState.conversations || null,
        activeConversation: initialState.activeConversation || null,
        messages: initialState.messages || null,
        isLoading: initialState.isLoading || false,
        loadingType: initialState.loadingType || null
      }
    });
    
    console.log('[STORE] Store initialization complete, state is now:', {
      spacesLoaded: get().spaces?.length || 0,
      activeSpaceLoaded: get().activeSpace?.id,
      conversationsLoaded: get().conversations?.length || 0,
      activeConversationLoaded: get().activeConversation?.id,
      messagesInUIState: get().uiState.messages?.length || 0
    });
  },
  
  // Update UI state method
  updateUIState: (updates) => {
    console.log('[STORE] Updating UI state with:', {
      updatesKeys: Object.keys(updates),
      hasMessages: 'messages' in updates,
      messagesCount: updates.messages?.length || 0,
      activeConversationChange: updates.activeConversation?.id !== get().uiState.activeConversation?.id,
      newActiveConversationId: updates.activeConversation?.id,
      currentActiveConversationId: get().uiState.activeConversation?.id
    });
    
    set((state) => ({
      uiState: {
        ...state.uiState,
        ...updates
      }
    }));
    
    // Log the state after update
    setTimeout(() => {
      console.log('[STORE] After UI state update, state is now:', {
        activeConversationId: get().uiState.activeConversation?.id,
        messagesInUIState: get().uiState.messages?.length || 0
      });
    }, 0);
  },
  
  // Fetch operations
  fetchSpaces: async () => {
    set({ isLoading: true });
    try {
      const response: any = await getSpacesAction();
      if (response && response.status === 'success' && response.data) {
        set({ spaces: response.data });
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching spaces:', error);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchSpace: async (id) => {
    set({ loadingSpaceId: id });
    try {
      const response: any = await getSpaceAction(id);
      if (response && response.status === 'success' && response.data) {
        // Update this space in our local spaces array
        set((state) => ({
          spaces: state.spaces?.map(space => 
            space.id === id ? response.data : space
          ) || [response.data]
        }));
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching space:', error);
      return null;
    } finally {
      set({ loadingSpaceId: null });
    }
  },
  
  fetchSpaceData: async (id) => {
    set({ 
      loadingSpaceId: id,
      uiState: {
        ...get().uiState,
        isLoading: true,
        loadingType: 'space'
      }
    });
    
    try {
      const response: any = await getSpaceDataAction(id);
      if (response && response.status === 'success' && response.data) {
        // If we get space data, also update the space in our store
        if (response.data.space) {
          set((state) => ({
            spaces: state.spaces?.map(space => 
              space.id === id ? response.data.space : space
            ) || [response.data.space]
          }));
        }
        
        // Update both standard and UI state
        set((state) => ({
          conversations: response.data.conversations,
          activeConversation: response.data.activeConversation,
          uiState: {
            ...state.uiState,
            activeSpace: response.data.space,
            conversations: response.data.conversations,
            activeConversation: response.data.activeConversation,
            messages: response.data.messages,
            isLoading: false,
            loadingType: null
          }
        }));
        
        return response.data;
      }
      
      set((state) => ({
        uiState: {
          ...state.uiState,
          isLoading: false,
          loadingType: null
        }
      }));
      
      return null;
    } catch (error) {
      console.error('Error fetching space data:', error);
      
      set((state) => ({
        uiState: {
          ...state.uiState,
          isLoading: false,
          loadingType: null
        }
      }));
      
      return null;
    } finally {
      set({ loadingSpaceId: null });
    }
  },
  
  loadSpaceFullData: async (spaceId) => {
    set((state) => ({
      uiState: {
        ...state.uiState,
        isLoading: true,
        loadingType: 'space'
      }
    }));
    
    try {
      const spaceDataResponse: any = await getSpaceDataAction(spaceId);
      
      if (spaceDataResponse) {
        const { space, conversations, activeConversation, messages } = spaceDataResponse;
        
        set((state) => ({
          activeSpace: space,
          spaces: state.spaces?.map(s => s.id === spaceId ? space : s) || [space],
          conversations: conversations,
          activeConversation: activeConversation,
          
          uiState: {
            activeSpace: space,
            conversations: conversations,
            activeConversation: activeConversation,
            messages: messages,
            isLoading: false,
            loadingType: null
          }
        }));
        
        await setActiveSpaceAction(spaceId);

        return spaceDataResponse;
      } else {
        set((state) => ({
          uiState: {
            ...state.uiState,
            isLoading: false,
            loadingType: null
          }
        }));

        return null;
      }
    } catch (error) {
      set((state) => ({
        uiState: {
          ...state.uiState,
          isLoading: false,
          loadingType: null
        }
      }));
    }
  },
  
  // Space local state operations
  setSpaces: (spaces) => set({ spaces }),
  
  setActiveSpace: (space) => set({ 
    activeSpace: space,
    uiState: {
      ...get().uiState,
      activeSpace: space
    } 
  }),
  
  updateLocalSpace: (id, updates) => set((state) => {
    const updatedSpaces = state.spaces?.map(space => 
      space.id === id ? { ...space, ...updates } : space
    ) || null;
    
    const updatedActiveSpace = state.activeSpace?.id === id 
      ? { ...state.activeSpace, ...updates } 
      : state.activeSpace;
    
    const updatedUIState = {
      ...state.uiState,
      activeSpace: state.uiState.activeSpace?.id === id 
        ? { ...state.uiState.activeSpace, ...updates }
        : state.uiState.activeSpace
    };
    
    return {
      spaces: updatedSpaces,
      activeSpace: updatedActiveSpace,
      uiState: updatedUIState
    };
  }),
  
  addLocalSpace: (space) => set((state) => {
    console.log('Adding local space:', space.id);
    const newSpaces = state.spaces 
      ? [space, ...state.spaces] 
      : [space];
      
    return {
      spaces: newSpaces
    };
  }),
  
  removeLocalSpace: (id) => set((state) => ({
    spaces: state.spaces?.filter(space => space.id !== id) || null,
    activeSpace: state.activeSpace?.id === id 
      ? null 
      : state.activeSpace,
    uiState: {
      ...state.uiState,
      activeSpace: state.uiState.activeSpace?.id === id 
        ? null
        : state.uiState.activeSpace
    }
  })),
  
  createSpace: async (name, description, model, provider, color) => {
    set({ 
      isLoading: true,
      uiState: {
        ...get().uiState,
        isLoading: true,
        loadingType: 'space'
      }
    });
    
    try {
      const space: any = await createSpaceAction(name, description, model, provider, true, color);

      set((state) => ({
        spaces: state.spaces ? [space, ...state.spaces] : [space],
        activeSpace: space,
        uiState: {
          ...state.uiState,
          activeSpace: space,
          isLoading: false,
          loadingType: null
        }
      }));

      await get().loadSpaceFullData(space.id);

      return space;
    } catch (error) {
      console.error('Error creating space:', error);
      
      set((state) => ({
        uiState: {
          ...state.uiState,
          isLoading: false,
          loadingType: null
        }
      }));
      
      toast.error('Creation Failed', {
        description: 'Could not create space'
      });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateSpace: async (id, updates) => { 
    try {
      set({ 
        isLoading: true,
        uiState: {
          ...get().uiState,
          isLoading: true,
          loadingType: 'space'
        }
      });

      get().updateLocalSpace(id, updates);

      const space: any = await updateSpaceAction(id, updates);

      if (space) {
        get().updateLocalSpace(id, space);

        
        set((state) => ({
          uiState: {
            ...state.uiState,
            isLoading: false,
            loadingType: null
          }
        }));

        return true;
      } else {
        const originalSpace = await get().fetchSpace(id);
        if (originalSpace) {
          get().updateLocalSpace(id, originalSpace);
        }
        
        set((state) => ({
          uiState: {
            ...state.uiState,
            isLoading: false,
            loadingType: null
          }
        }));

        return false;
      }
    } catch (error) {
      const originalSpace = await get().fetchSpace(id);
      if (originalSpace) {
        get().updateLocalSpace(id, originalSpace);
      }
      
      set((state) => ({
        uiState: {
          ...state.uiState,
          isLoading: false,
          loadingType: null
        }
      }));
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteSpace: async (id) => {
    set({ 
      loadingSpaceId: id,
      uiState: {
        ...get().uiState,
        isLoading: true,
        loadingType: 'space'
      }
    });
    
    try {
      // Check if this is the active space
      const isActiveSpace = get().activeSpace?.id === id;
      const isUIActiveSpace = get().uiState.activeSpace?.id === id;
      
      // Get space before deletion for potential rollback
      const spaceToDelete = get().spaces?.find(space => space.id === id);
      
      // Update local state optimistically
      get().updateLocalSpace(id, { is_deleted: true });
      
      // Remove from UI immediately (optimistic)
      get().removeLocalSpace(id);
      
      try {
        // Call deleteSpaceAction which returns void or throws an error
        await deleteSpaceAction(id);
        
        // If we reach here, deletion was successful
        toast.success('Space Deleted', {
          description: 'Space has been removed'
        });
        
        // If this was the active space, find the next most recently updated space and set it as active
        if (isActiveSpace || isUIActiveSpace) {
          // Get all spaces, sorted by updated_at
          const remainingSpaces = get().spaces?.filter(space => !space.is_deleted) || [];
          
          if (remainingSpaces.length > 0) {
            // Sort spaces by updated_at (most recent first)
            const sortedSpaces = [...remainingSpaces].sort((a, b) => 
              new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime()
            );
            
            // Get the most recently updated space
            const nextActiveSpace = sortedSpaces[0];
            
            if (nextActiveSpace) {
              // Load the full space data for the new active space
              await get().loadSpaceFullData(nextActiveSpace.id);
            } else {
              // No spaces left, clear UI state
              set({
                activeSpace: null,
                conversations: null,
                activeConversation: null,
                uiState: {
                  activeSpace: null,
                  conversations: [],
                  activeConversation: null,
                  messages: [],
                  isLoading: false,
                  loadingType: null
                }
              });
            }
          } else {
            // No spaces left, clear UI state
            set({
              activeSpace: null,
              conversations: null,
              activeConversation: null,
              uiState: {
                activeSpace: null,
                conversations: [],
                activeConversation: null,
                messages: [],
                isLoading: false,
                loadingType: null
              }
            });
          }
        } else {
          // Not the active space, just reset loading
          set((state) => ({
            uiState: {
              ...state.uiState,
              isLoading: false,
              loadingType: null
            }
          }));
        }
        
        return true;
      } catch (actionError) {
        // Handle error from the deleteSpaceAction
        console.error('Error deleting space:', actionError);
        
        // Restore the space on failure
        if (spaceToDelete) {
          get().addLocalSpace(spaceToDelete);
        }
        
        set((state) => ({
          uiState: {
            ...state.uiState,
            isLoading: false,
            loadingType: null
          }
        }));
        
        toast.error('Deletion Failed', {
          description: 'Could not delete space'
        });
        return false;
      }
    } catch (error) {
      console.error('Error deleting space:', error);
      
      // Try to restore the space
      const spaceToRestore = get().spaces?.find(space => space.id === id);
      if (spaceToRestore) {
        get().addLocalSpace(spaceToRestore);
      }
      
      set((state) => ({
        uiState: {
          ...state.uiState,
          isLoading: false,
          loadingType: null
        }
      }));
      
      toast.error('Deletion Failed', {
        description: 'Could not delete space'
      });
      return false;
    } finally {
      set({ loadingSpaceId: null });
    }
  },
  
  setActiveSpaceOnServer: async (id) => {
    set({ 
      loadingSpaceId: id,
      uiState: {
        ...get().uiState,
        isLoading: true,
        loadingType: 'space'
      }
    });
    
    try {
      // Load the full space data for UI rendering
      await get().loadSpaceFullData(id);
      
      return true;
    } catch (error) {
      console.error('Error setting active space:', error);
      
      set((state) => ({
        uiState: {
          ...state.uiState,
          isLoading: false,
          loadingType: null
        }
      }));
      
      toast.error('Activation Failed', {
        description: 'Could not set active space'
      });
      return false;
    } finally {
      set({ loadingSpaceId: null });
    }
  },
  
  // Conversation state operations
  setConversations: (conversations) => set({ 
    conversations,
    uiState: {
      ...get().uiState,
      conversations
    }
  }),
  
  setActiveConversation: (conversation) => {
    console.log('[STORE] Setting active conversation:', {
      conversationId: conversation?.id,
      title: conversation?.title,
      messagesInUIState: get().uiState.messages?.length || 0
    });
    
    set({ 
      activeConversation: conversation,
      uiState: {
        ...get().uiState,
        activeConversation: conversation
      }
    });
  },
  
  updateLocalConversation: (id, updates) => set((state) => {
    const updatedConversations = state.conversations?.map(conversation => 
      conversation.id === id ? { ...conversation, ...updates } : conversation
    ) || null;
    
    const updatedActiveConversation = state.activeConversation?.id === id 
      ? { ...state.activeConversation, ...updates } 
      : state.activeConversation;
    
    return {
      conversations: updatedConversations,
      activeConversation: updatedActiveConversation,
      uiState: {
        ...state.uiState,
        conversations: updatedConversations,
        activeConversation: updatedActiveConversation
      }
    };
  }),
  
  addLocalConversation: (conversation) => set((state) => {
    const newConversations = state.conversations 
      ? [conversation, ...state.conversations] 
      : [conversation];
      
    return {
      conversations: newConversations,
      uiState: {
        ...state.uiState,
        conversations: newConversations
      }
    };
  }),
  
  removeLocalConversation: (id) => set((state) => {
    const filteredConversations = state.conversations?.filter(conv => conv.id !== id) || null;
    const updatedActiveConversation = state.activeConversation?.id === id 
      ? null 
      : state.activeConversation;
      
    return {
      conversations: filteredConversations,
      activeConversation: updatedActiveConversation,
      uiState: {
        ...state.uiState,
        conversations: filteredConversations,
        activeConversation: updatedActiveConversation
      }
    };
  }),
  
  // Conversation server operations with optimistic updates
  createConversation: async (title) => {
    const activeSpace = get().activeSpace;
    
    if (!activeSpace?.id) {
      toast.error('Cannot Create Conversation', {
        description: 'No active space selected'
      });
      return null;
    }
    
    set({ 
      loadingConversationId: 'creating',
      uiState: {
        ...get().uiState,
        isLoading: true,
        loadingType: 'conversation'
      }
    });
    
    try {
      // Call server action
      const newConversation = await createConversationAction(activeSpace.id, title);
      
      if (!newConversation) {
        toast.error('Creation Failed', {
          description: 'Could not create conversation'
        });
        
        set((state) => ({
          uiState: {
            ...state.uiState,
            isLoading: false,
            loadingType: null
          }
        }));
        
        return null;
      }
      
      // Update state with new conversation
      get().setActiveConversation(newConversation);
      get().addLocalConversation(newConversation);
      
      set((state) => ({
        uiState: {
          ...state.uiState,
          isLoading: false,
          loadingType: null
        }
      }));
      
      toast.success('Conversation Created', {
        description: 'Start chatting now!'
      });
      
      return newConversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      
      toast.error('Creation Failed', {
        description: 'Could not create conversation'
      });
      
      set((state) => ({
        uiState: {
          ...state.uiState,
          isLoading: false,
          loadingType: null
        }
      }));
      
      return null;
    } finally {
      set({ loadingConversationId: null });
    }
  },
  
  selectConversation: async (conversationId) => {
    console.log('[STORE] Selecting conversation:', {
      requestedId: conversationId,
      currentActiveId: get().activeConversation?.id,
      spaceId: get().activeSpace?.id
    });
    
    const activeSpace = get().activeSpace;
    
    if (!activeSpace?.id) {
      console.error('[STORE] Cannot select conversation, no active space');
      toast.error('Cannot Select Conversation', {
        description: 'No active space selected'
      });
      return false;
    }
    
    try {
      const conversation = get().conversations?.find(c => c.id === conversationId);
      
      if (!conversation) {
        console.warn('[STORE] Conversation not found:', conversationId);
        return false;
      }
      
      console.log('[STORE] Found conversation, setting as active:', {
        id: conversation.id,
        title: conversation.title
      });
      
      get().setActiveConversation(conversation);
      
      // Check if the uiState reflected the change
      setTimeout(() => {
        console.log('[STORE] After selection, state is now:', {
          activeConversationId: get().activeConversation?.id,
          uiStateActiveConversationId: get().uiState.activeConversation?.id,
          messagesInUIState: get().uiState.messages?.length || 0
        });
      }, 0);
      
      return true;
    } catch (error) {
      console.error('[STORE] Failed to select conversation:', error);
      toast.error('Selection Failed', {
        description: 'Could not select conversation'
      });
      return false;
    }
  },
  
  updateConversation: async (conversationId, title) => {
    const activeSpace = get().activeSpace;
    
    if (!activeSpace?.id) {
      toast.error('Cannot Update Conversation', {
        description: 'No active space selected'
      });
      return false;
    }
    
    set({ loadingConversationId: conversationId });
    
    try {
      get().updateLocalConversation(conversationId, { title });
      
      await updateConversationTitleAction(conversationId, title);
      
      return true;
    } catch (error) {
      console.error('Failed to update conversation:', error);
      
      return false;
    } finally {
      set({ loadingConversationId: null });
    }
  },
  
  deleteConversation: async (conversationId) => {
    const activeSpace = get().activeSpace;
    
    if (!activeSpace?.id) {
      toast.error('Cannot Delete Conversation', {
        description: 'No active space selected'
      });
      return false;
    }
    
    set({ loadingConversationId: conversationId });
    
    try {
      get().updateLocalConversation(conversationId, { is_deleted: true });
      
      if (get().activeConversation?.id === conversationId) {
        get().setActiveConversation(null);
      }
      
      await deleteConversationAction(conversationId);
      
      get().removeLocalConversation(conversationId);
      
      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      
      get().updateLocalConversation(conversationId, { is_deleted: false });

      return false;
    } finally {
      set({ loadingConversationId: null });
    }
  },
  
  // Loading state
  setLoading: (isLoading) => set({ 
    isLoading,
    uiState: {
      ...get().uiState,
      isLoading
    }
  }),
  
  setLoadingSpaceId: (id) => set({ loadingSpaceId: id }),
  
  setLoadingConversationId: (id) => set({ loadingConversationId: id }),
  
  // Navigation helper (keeping for backward compatibility)
  navigateToActiveConversation: (router) => {
    const activeSpace = get().activeSpace;
    
    if (!activeSpace) {
      // If no active space, go to the home page
      router.push('/protected');
      return;
    }
    
    // Check if we have an active conversation in the space
    const activeConversation = get().activeConversation;
    const conversations = get().conversations;
    
    if (activeConversation && activeConversation.id) {
      // Navigate to the active conversation
      router.push(`/protected/spaces/${activeSpace.id}/conversations/${activeConversation.id}`);
    } else if (conversations && conversations.length > 0 && conversations[0] && conversations[0].id) {
      // Navigate to the first conversation
      router.push(`/protected/spaces/${activeSpace.id}/conversations/${conversations[0].id}`);
    } else {
      // No conversations, just go to the space
      router.push(`/protected/spaces/${activeSpace.id}/conversations`);
    }
  },
}));

// Helper functions
export const getCurrentSpaces = () => useSpaceStore.getState().spaces || []; 
export const getActiveSpace = () => useSpaceStore.getState().activeSpace;
export const getCurrentConversations = () => useSpaceStore.getState().conversations || [];
export const getActiveConversation = () => useSpaceStore.getState().activeConversation; 