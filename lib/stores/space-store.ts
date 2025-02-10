import { create } from 'zustand'
import { Space } from '@/types'
import { setActiveSpace as setActiveSpaceAction } from '@/app/actions'

interface SpaceStore {
  activeSpace: Space | null
  setActiveSpace: (spaceOrId: Space | string | null) => Promise<void>
  spaces: Space[] | null
  setSpaces: (spaces: Space[] | null) => void
}

export const useSpaceStore = create<SpaceStore>((set) => ({
  activeSpace: null,
  setActiveSpace: async (spaceOrId) => {
    if (typeof spaceOrId === 'string') {
      await setActiveSpaceAction(spaceOrId)
      set({ activeSpace: null }) // Clear until next fetch
    } else {
      set({ activeSpace: spaceOrId })
    }
  },
  spaces: null,
  setSpaces: (spaces) => set({ spaces }),
})) 