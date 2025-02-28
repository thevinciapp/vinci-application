import { useState, useCallback } from 'react'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { 
  createConversation as createConversationAction, 
  updateConversationTitle,
  deleteConversation as deleteConversationAction
} from '@/app/actions'
import { useToast } from '@/hooks/use-toast'
import { Conversation } from '@/types'
import { useSpaceActions } from './useSpaceActions'

// Types
interface UseConversationActionsOptions {
  onCreateSuccess?: (conversation: Conversation) => Promise<void> | void
  onSelectSuccess?: (conversation: Conversation) => Promise<void> | void
  onUpdateSuccess?: (conversation: Conversation) => Promise<void> | void
  onDeleteSuccess?: (conversationId: string) => Promise<void> | void
  showToasts?: boolean
}

interface ConversationStore {
  conversations: Conversation[] | null
  activeConversation: Conversation | null
  setConversations: (conversations: Conversation[] | null) => void
  setActiveConversation: (conversation: Conversation | null) => void
}

interface OperationState {
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  isSuccess: boolean
}

// Store
const useConversationStore = create<ConversationStore>()(
  subscribeWithSelector((set) => ({
    conversations: null,
    activeConversation: null,
    setConversations: (conversations) => set({ conversations }),
    setActiveConversation: (activeConversation) => set({ activeConversation })
  }))
)

// Single Hook with All State and Actions
export function useConversationActions(options: UseConversationActionsOptions = {}) {
  const { activeSpace } = useSpaceActions()
  const { toast } = useToast()
  const { conversations, activeConversation, setConversations, setActiveConversation } = useConversationStore()

  const [operationState, setOperationState] = useState<OperationState>({
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isSuccess: false
  })

  // Utility Functions
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

  const checkActiveSpace = useCallback((): boolean => {
    if (!activeSpace?.id) {
      console.warn('No active space found')
      return false
    }
    return true
  }, [activeSpace])

  // Core Actions
  const createConversation = useCallback(async (title?: string): Promise<Conversation | null> => {
    if (!checkActiveSpace() || operationState.isCreating) {
      console.warn('Cannot create conversation: No active space or creation in progress')
      return null
    }

    try {
      setOperationState(prev => ({ ...prev, isCreating: true }))
      const newConversation = await createConversationAction(activeSpace.id, title)
      
      if (!newConversation) return null

      setActiveConversation(newConversation)
      setConversations(conversations ? [newConversation, ...conversations] : [newConversation])
      
      await options.onCreateSuccess?.(newConversation)
      setSuccessBriefly()
      showToast('Conversation Created', 'Start chatting now!', 'success')
      return newConversation
    } catch (error) {
      console.error('Failed to create conversation:', error)
      showToast('Creation Failed', 'Could not create conversation', 'destructive')
      return null
    } finally {
      setOperationState(prev => ({ ...prev, isCreating: false }))
    }
  }, [
    checkActiveSpace,
    conversations,
    setConversations,
    setActiveConversation,
    options.onCreateSuccess,
    showToast,
    setSuccessBriefly,
    activeSpace
  ])

  const selectConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!checkActiveSpace()) return false

    try {
      const conversation = conversations?.find(c => c.id === conversationId)
      if (!conversation) {
        console.warn('Conversation not found:', conversationId)
        return false
      }
      
      setActiveConversation(conversation)
      await options.onSelectSuccess?.(conversation)
      return true
    } catch (error) {
      console.error('Failed to select conversation:', error)
      showToast('Selection Failed', 'Could not select conversation', 'destructive')
      return false
    }
  }, [checkActiveSpace, conversations, setActiveConversation, options.onSelectSuccess, showToast])

  const updateConversation = useCallback(async (
    conversationId: string,
    title: string
  ): Promise<boolean> => {
    if (!checkActiveSpace() || operationState.isUpdating) {
      console.warn('Cannot update conversation: No active space or update in progress')
      return false
    }

    try {
      setOperationState(prev => ({ ...prev, isUpdating: true }))
      await updateConversationTitle(conversationId, title)
      const conversationToUpdate = conversations?.find(c => c.id === conversationId)
      
      if (!conversationToUpdate) return false

      const updatedConversation: Conversation = { ...conversationToUpdate, title }
      setConversations(
        conversations?.map(c => c.id === conversationId ? updatedConversation : c) || null
      )
      
      if (activeConversation?.id === conversationId) {
        setActiveConversation(updatedConversation)
      }
      
      await options.onUpdateSuccess?.(updatedConversation)
      showToast('Conversation Updated', 'Title updated successfully', 'success')
      return true
    } catch (error) {
      console.error('Failed to update conversation:', error)
      showToast('Update Failed', 'Could not update conversation', 'destructive')
      return false
    } finally {
      setOperationState(prev => ({ ...prev, isUpdating: false }))
    }
  }, [
    checkActiveSpace,
    conversations,
    activeConversation,
    setConversations,
    setActiveConversation,
    options.onUpdateSuccess,
    showToast
  ])

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!checkActiveSpace() || operationState.isDeleting) {
      console.warn('Cannot delete conversation: No active space or deletion in progress')
      return false
    }

    try {
      setOperationState(prev => ({ ...prev, isDeleting: true }))
      await deleteConversationAction(conversationId)
      
      if (conversations) {
        setConversations(
          conversations.map(c => 
            c.id === conversationId ? { ...c, is_deleted: true } : c
          )
        )
      }
      
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null)
      }
      
      await options.onDeleteSuccess?.(conversationId)
      showToast('Conversation Deleted', 'Deletion successful', 'success')
      return true
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      showToast('Deletion Failed', 'Could not delete conversation', 'destructive')
      return false
    } finally {
      setOperationState(prev => ({ ...prev, isDeleting: false }))
    }
  }, [
    checkActiveSpace,
    conversations,
    activeConversation,
    setConversations,
    setActiveConversation,
    options.onDeleteSuccess,
    showToast
  ])

  return {
    conversations,
    activeConversation,
    isCreating: operationState.isCreating,
    isUpdating: operationState.isUpdating,
    isDeleting: operationState.isDeleting,
    isSuccess: operationState.isSuccess,
    setConversations,
    setActiveConversation,
    createConversation,
    selectConversation,
    updateConversation,
    deleteConversation
  }
}

// Utility Function (kept as is, since it’s not a hook)
export const getCurrentConversations = () => useConversationStore.getState().conversations || []