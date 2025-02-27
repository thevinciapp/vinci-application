import { create } from 'zustand'
import { Space } from '@/types'
import { setActiveSpace as setActiveSpaceAction } from '@/app/actions'

interface SpaceStore {
  activeSpace: Space | null
  setActiveSpace: (spaceOrId: Space | string | null) => Promise<void>
  spaces: Space[] | null
  setSpaces: (spaces: Space[] | null) => void
}

export const useSpaceStore = create<SpaceStore>((set, get) => ({
  activeSpace: null,
  setActiveSpace: async (spaceOrId) => {
    if (typeof spaceOrId === 'string') {
      const space = get().spaces?.find(space => space.id === spaceOrId)
      if (space) {
        set({ activeSpace: space })
      }
      await setActiveSpaceAction(spaceOrId)
    } else {
      set({ activeSpace: spaceOrId })
    }
  },
  spaces: null,
  setSpaces: (spaces) => set({ spaces }),
})) 