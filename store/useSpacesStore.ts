import { create } from 'zustand';
import { Space } from '@/types';
import { getSpaces, createSpace, setActiveSpace } from '@/app/actions';

interface SpacesState {
  spaces: Space[];
  isLoading: boolean;
  isInitialized: boolean; // Track if we've attempted to load data
  activeSpaceId: string | null;
  error: string | null;
  
  // Actions
  fetchSpaces: () => Promise<void>;
  createNewSpace: (name: string, description: string, model: string, provider: string) => Promise<Space | null>;
  setActive: (spaceId: string) => Promise<void>;
  clearError: () => void;
}

export const useSpacesStore = create<SpacesState>((set, get) => ({
  spaces: [],
  isLoading: false,
  isInitialized: false,
  activeSpaceId: null,
  error: null,
  
  fetchSpaces: async () => {
    // Don't fetch if already loading
    if (get().isLoading) {
      console.log('Spaces already loading, skipping fetch');
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      console.log('Fetching spaces from server...');
      const spaces = await getSpaces();
      
      if (!spaces) {
        console.warn('No spaces returned from server - this may be an authentication issue');
        set({ 
          spaces: [], 
          isLoading: false, 
          isInitialized: true,
          error: 'Failed to fetch spaces - please check if you are logged in'
        });
        return;
      }
      
      console.log(`Successfully fetched ${spaces.length} spaces`);
      set({ 
        spaces: spaces, 
        isLoading: false, 
        isInitialized: true,
        error: null
      });
    } catch (error) {
      console.error('Error fetching spaces:', error);
      set({ 
        error: 'Failed to fetch spaces', 
        isLoading: false,
        isInitialized: true 
      });
    }
  },
  
  createNewSpace: async (name, description, model, provider) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`Creating new space "${name}" with model ${model} from ${provider}`);
      const newSpace = await createSpace(name, description, model, provider, true);
      if (newSpace) {
        // Update the spaces list with the new space
        set(state => ({ 
          spaces: [newSpace, ...state.spaces],
          activeSpaceId: newSpace.id,
          isLoading: false,
          error: null
        }));
        console.log(`Successfully created space: ${newSpace.id}`);
      } else {
        set({ 
          error: 'Failed to create space - no space returned', 
          isLoading: false 
        });
      }
      return newSpace;
    } catch (error) {
      console.error('Error creating space:', error);
      set({ error: 'Failed to create space', isLoading: false });
      return null;
    }
  },
  
  setActive: async (spaceId) => {
    try {
      console.log(`Setting active space: ${spaceId}`);
      await setActiveSpace(spaceId);
      set({ activeSpaceId: spaceId });
    } catch (error) {
      console.error('Error setting active space:', error);
      set({ error: 'Failed to set active space' });
    }
  },
  
  clearError: () => set({ error: null })
})); 