import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Space {
  id: string;
  name: string;
  user_id: string;
  description?: string;
  icon?: string;
  color?: string;
  model: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

interface SpaceStore {
  spaces: Space[];
  activeSpaceId: string | null;
  addSpace: (space: Omit<Space, 'id' | 'created_at' | 'updated_at'>) => void;
  removeSpace: (id: string) => void;
  updateSpace: (id: string, updates: Partial<Space>) => void;
  setActiveSpace: (id: string) => void;
}

export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set) => ({
      spaces: [],
      activeSpaceId: null,
      addSpace: (spaceData) => set((state) => {
        const newSpace: Space = {
          id: crypto.randomUUID(),
          ...spaceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return {
          spaces: [...state.spaces, newSpace],
          activeSpaceId: state.activeSpaceId || newSpace.id,
        };
      }),
      removeSpace: (id) => set((state) => ({
        spaces: state.spaces.filter((space) => space.id !== id),
        activeSpaceId: state.activeSpaceId === id
          ? state.spaces[0]?.id || null
          : state.activeSpaceId,
      })),
      updateSpace: (id, updates) => set((state) => ({
        spaces: state.spaces.map((space) =>
          space.id === id
            ? { ...space, ...updates, updated_at: new Date().toISOString() }
            : space
        ),
      })),
      setActiveSpace: (id) => set({ activeSpaceId: id }),
    }),
    {
      name: 'spatial-spaces',
    }
  )
);
