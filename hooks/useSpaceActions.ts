import { useState, useCallback } from 'react'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { 
  createSpace as createSpaceAction,
  setActiveSpace as setActiveSpaceAction,
  updateSpace as updateSpaceAction
} from '@/app/actions'
import { useToast } from '@/hooks/use-toast'
import { Space } from '@/types'

// Types
interface UseSpaceActionsOptions {
  onCreateSuccess?: (space: Space) => Promise<void> | void
  onSelectSuccess?: (space: Space) => Promise<void> | void
  onUpdateSuccess?: (space: Space) => Promise<void> | void
  showToasts?: boolean
}

interface SpaceStore {
  spaces: Space[] | null
  activeSpace: Space | null
  setSpaces: (spaces: Space[] | null) => void
  setActiveSpace: (space: Space | null) => void
}

interface OperationState {
  isCreating: boolean
  isUpdating: boolean
  isSuccess: boolean
}

// Store
const useSpaceStore = create<SpaceStore>()(
  subscribeWithSelector((set) => ({
    spaces: null,
    activeSpace: null,
    setSpaces: (spaces) => set({ spaces }),
    setActiveSpace: (activeSpace) => set({ activeSpace })
  }))
)

// Single Hook with All State and Actions
export function useSpaceActions(options: UseSpaceActionsOptions = {}) {
  const { toast } = useToast()
  const { spaces, activeSpace, setSpaces, setActiveSpace } = useSpaceStore()
  
  const [operationState, setOperationState] = useState<OperationState>({
    isCreating: false,
    isUpdating: false,
    isSuccess: false
  })

  const showToast = useCallback((
    title: string,
    description: string,
    variant: 'default' | 'success' | 'destructive' = 'default'
  ) => {
    if (options.showToasts !== false) {
      toast({ title, description, variant, duration: 2000 })
    }
  }, [toast, options.showToasts])

  const setSuccessBriefly = useCallback(() => {
    setOperationState(prev => ({ ...prev, isSuccess: true }))
    const timeout = setTimeout(() => 
      setOperationState(prev => ({ ...prev, isSuccess: false })), 
      1500
    )
    return () => clearTimeout(timeout)
  }, [])

  const createSpace = useCallback(async (
    name: string,
    description = '',
    model: string,
    provider: string,
    color?: string
  ): Promise<Space | null> => {
    if (operationState.isCreating) {
      console.warn('Space creation already in progress')
      return null
    }

    try {
      setOperationState(prev => ({ ...prev, isCreating: true }))
      const newSpace = await createSpaceAction(name, description, model, provider, true, color)
      
      if (!newSpace) return null

      setActiveSpace(newSpace)
      setSpaces(spaces ? [newSpace, ...spaces] : [newSpace])
      
      await options.onCreateSuccess?.(newSpace)
      setSuccessBriefly()
      showToast('Space Created', 'Your new workspace is ready', 'success')
      return newSpace
    } catch (error) {
      console.error('Failed to create space:', error)
      showToast('Creation Failed', 'Could not create space', 'destructive')
      return null
    } finally {
      setOperationState(prev => ({ ...prev, isCreating: false }))
    }
  }, [spaces, setSpaces, setActiveSpace, options.onCreateSuccess, showToast, setSuccessBriefly])

  const selectSpace = useCallback(async (spaceId: string): Promise<boolean> => {
    try {
      const space = spaces?.find(s => s.id === spaceId)
      if (!space) {
        console.warn('Space not found:', spaceId)
        return false
      }

      await setActiveSpaceAction(spaceId)
      setActiveSpace(space)
      await options.onSelectSuccess?.(space)
      return true
    } catch (error) {
      console.error('Failed to select space:', error)
      showToast('Selection Failed', 'Could not select space', 'destructive')
      return false
    }
  }, [spaces, setActiveSpace, options.onSelectSuccess, showToast])

  const updateSpace = useCallback(async (
    spaceId: string,
    updates: Partial<Space>
  ): Promise<boolean> => {
    if (operationState.isUpdating) {
      console.warn('Space update already in progress')
      return false
    }

    try {
      setOperationState(prev => ({ ...prev, isUpdating: true }))
      const updatedSpace = await updateSpaceAction(spaceId, updates)
      
      if (!updatedSpace) return false

      if (spaces) {
        setSpaces(spaces.map(s => s.id === spaceId ? updatedSpace : s))
      }
      if (activeSpace?.id === spaceId) {
        setActiveSpace(updatedSpace)
      }
      
      await options.onUpdateSuccess?.(updatedSpace)
      showToast('Space Updated', 'Changes saved successfully', 'success')
      return true
    } catch (error) {
      console.error('Failed to update space:', error)
      showToast('Update Failed', 'Could not update space', 'destructive')
      return false
    } finally {
      setOperationState(prev => ({ ...prev, isUpdating: false }))
    }
  }, [spaces, activeSpace, setSpaces, setActiveSpace, options.onUpdateSuccess, showToast])

  return {
    spaces,              // Direct state access
    activeSpace,         // Direct state access
    isCreating: operationState.isCreating,
    isUpdating: operationState.isUpdating,
    isSuccess: operationState.isSuccess,
    setSpaces,
    setActiveSpace,
    createSpace,
    selectSpace,
    updateSpace
  }
}