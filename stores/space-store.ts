import { create } from 'zustand';

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
  [key: string]: any;
}

export interface SpaceStore {
  spaces: Space[] | null;
  activeSpace: Space | null;
  setSpaces: (spaces: Space[] | null) => void;
  setActiveSpace: (space: Space | null) => void;
  updateSpace: (id: string, updates: Partial<Space>) => void;
  addSpace: (space: Space) => void;
  removeSpace: (id: string) => void;
}

export const useSpaceStore = create<SpaceStore>((set) => ({
  spaces: null,
  activeSpace: null,
  
  setSpaces: (spaces) => set({ spaces }),
  
  setActiveSpace: (space) => set({ activeSpace: space }),
  
  updateSpace: (id, updates) => set((state) => ({
    spaces: state.spaces?.map(space => 
      space.id === id ? { ...space, ...updates } : space
    ) || null,
    activeSpace: state.activeSpace?.id === id 
      ? { ...state.activeSpace, ...updates } 
      : state.activeSpace
  })),
  
  addSpace: (space) => set((state) => ({
    spaces: state.spaces 
      ? [space, ...state.spaces] 
      : [space]
  })),
  
  removeSpace: (id) => set((state) => ({
    spaces: state.spaces?.filter(space => space.id !== id) || null,
    activeSpace: state.activeSpace?.id === id 
      ? null 
      : state.activeSpace
  }))
}));

// Helper function to get current spaces
export const getCurrentSpaces = () => useSpaceStore.getState().spaces || []; 