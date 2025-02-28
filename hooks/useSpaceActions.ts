import { useCallback, useState } from 'react'
import { 
  createSpace as createSpaceAction,
  setActiveSpace as setActiveSpaceAction,
  updateSpace as updateSpaceAction,
  getSpaceData,
} from '@/app/actions'
import { useToast } from '@/hooks/use-toast'
import { Space } from '@/types'
import { useRouter } from 'next/navigation'

// Types
interface UseSpaceActionsOptions {
  showToasts?: boolean
}

/**
 * Hook for space-related actions
 * This hook doesn't manage any state - it simply provides methods to call server actions,
 * handle routing, and display toast notifications
 */
export function useSpaceActions(options: UseSpaceActionsOptions = {}) {
  const { toast } = useToast()
  const router = useRouter()
  // Add loading state - this is the only state this hook maintains
  const [loadingSpaceId, setLoadingSpaceId] = useState<string | null>(null)
  
  // Helper for showing toast notifications
  const showToast = useCallback((
    title: string,
    description: string,
    variant: 'default' | 'success' | 'destructive' = 'default'
  ) => {
    if (options.showToasts !== false) {
      toast({ title, description, variant, duration: 2000 })
    }
  }, [toast, options.showToasts])

  /**
   * Create a new space
   */
  const createSpace = useCallback(async (
    name: string,
    description = '',
    model: string,
    provider: string,
    color?: string
  ): Promise<Space | null> => {
    try {
      // Set loading state
      setLoadingSpaceId('creating')
      
      // Create the space using server action
      const newSpace = await createSpaceAction(name, description, model, provider, true, color)
      
      if (!newSpace) {
        setLoadingSpaceId(null)
        return null
      }

      // Get space data to find the default conversation
      const spaceData = await getSpaceData(newSpace.id)
      
      // Route to the conversation
      if (spaceData && spaceData.conversations && spaceData.conversations.length > 0) {
        // Route to the first conversation
        router.push(`/protected/spaces/${newSpace.id}/conversations/${spaceData.conversations[0].id}`)
      } else {
        // If no conversations found, just route to the space
        router.push(`/protected/spaces/${newSpace.id}/conversations`)
      }
      
      // Show success toast
      showToast('Space Created', 'Your new workspace is ready', 'success')
      
      // Reset loading state
      setLoadingSpaceId(null)
      return newSpace
    } catch (error) {
      console.error('Failed to create space:', error)
      showToast('Creation Failed', 'Could not create space', 'destructive')
      setLoadingSpaceId(null)
      return null
    }
  }, [router, showToast])

  /**
   * Select a space - sets it as the active space
   */
  const selectSpace = useCallback(async (spaceId: string): Promise<boolean> => {
    try {
      // Set loading state
      setLoadingSpaceId(spaceId)
      
      // Set active space on server
      await setActiveSpaceAction(spaceId)
      
      // Simply navigate to the conversations page for this space
      router.push(`/protected/spaces/${spaceId}/conversations`)
      
      // Note: We don't clear the loading state here
      // It will be cleared by the parent component when navigation completes
      
      return true
    } catch (error) {
      console.error('Failed to select space:', error)
      showToast('Selection Failed', 'Could not select space', 'destructive')
      // Reset loading state on error
      setLoadingSpaceId(null)
      return false
    }
  }, [router, showToast, setLoadingSpaceId])

  /**
   * Update an existing space
   */
  const updateSpace = useCallback(async (
    spaceId: string,
    updates: Partial<Space>
  ): Promise<boolean> => {
    try {
      // Set loading state
      setLoadingSpaceId(spaceId)
      
      // Update space on server
      const updatedSpace = await updateSpaceAction(spaceId, updates)
      
      if (!updatedSpace) {
        setLoadingSpaceId(null)
        return false
      }
      
      showToast('Space Updated', 'Changes saved successfully', 'success')
      
      // Reset loading state
      setLoadingSpaceId(null)
      return true
    } catch (error) {
      console.error('Failed to update space:', error)
      showToast('Update Failed', 'Could not update space', 'destructive')
      // Reset loading state
      setLoadingSpaceId(null)
      return false
    }
  }, [showToast])

  /**
   * Check if a space is currently loading
   */
  const isLoadingSpace = useCallback((spaceId?: string) => {
    if (!spaceId) {
      // Return true if any space is loading
      return loadingSpaceId !== null
    }
    // Return true if this specific space is loading
    return loadingSpaceId === spaceId
  }, [loadingSpaceId])

  return {
    createSpace,
    selectSpace,
    updateSpace,
    isLoadingSpace,
    loadingSpaceId
  }
}