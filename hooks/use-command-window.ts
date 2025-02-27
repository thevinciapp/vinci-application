import { useCallback, useState } from 'react'
import { useModalNavigationStore } from '../stores/modal-navigation-store'

export function useCommandWindow() {
  const [showSpaces, setShowSpaces] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const [showConversations, setShowConversations] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  // Get access to the navigation store
  const { addToHistory, resetHistory, setDirectOpen } = useModalNavigationStore()

  const openCommandWindow = useCallback((options: { 
    withSpaces?: boolean
    withModels?: boolean 
    withConversations?: boolean
    withSimilarMessages?: boolean
  } = {}) => {
    setIsOpen(true)
    
    // Determine which modal to open
    if (options.withSpaces) {
      setShowSpaces(true)
      // Record direct open via hotkey
      setDirectOpen('spaces')
    } else if (options.withModels) {
      setShowModels(true)
      // Record direct open via hotkey
      setDirectOpen('models')
    } else if (options.withConversations) {
      setShowConversations(true)
      // Record direct open via hotkey
      setDirectOpen('conversations')
    } else if (options.withSimilarMessages) {
      // This is handled in the provider
      // setDirectOpen will be called there
    } else {
      // Opening the main modal
      setDirectOpen('main')
      // Reset any modal specific state
      setShowSpaces(false)
      setShowModels(false)
      setShowConversations(false)
    }
  }, [setDirectOpen])

  const closeCommandWindow = useCallback(() => {
    setIsOpen(false)
    setShowSpaces(false)
    setShowModels(false)
    setShowConversations(false)
    
    // Reset navigation history when closing the modal
    resetHistory()
  }, [resetHistory])

  const toggleCommandWindow = useCallback((options: {
    withSpaces?: boolean
    withModels?: boolean
    withConversations?: boolean
    withSimilarMessages?: boolean
  } = {}) => {
    setIsOpen((prevIsOpen) => {
      const nextIsOpen = !prevIsOpen
      
      if (nextIsOpen) {
        // If opening, use the openCommandWindow logic
        if (options.withSpaces) {
          setShowSpaces(true)
          setShowModels(false)
          setShowConversations(false)
          setDirectOpen('spaces')
        } else if (options.withModels) {
          setShowSpaces(false)
          setShowModels(true)
          setShowConversations(false)
          setDirectOpen('models')
        } else if (options.withConversations) {
          setShowSpaces(false)
          setShowModels(false)
          setShowConversations(true)
          setDirectOpen('conversations')
        } else if (options.withSimilarMessages) {
          // This is handled in the provider
          // setDirectOpen will be called there
        } else {
          setShowSpaces(false)
          setShowModels(false)
          setShowConversations(false)
          setDirectOpen('main')
        }
      } else {
        // If closing, reset everything
        setShowSpaces(false)
        setShowModels(false)
        setShowConversations(false)
        resetHistory()
      }
      
      return nextIsOpen
    })
  }, [setDirectOpen, resetHistory])

  return {
    isOpen,
    showSpaces,
    showModels,
    showConversations,
    setShowSpaces,
    setShowModels,
    setShowConversations,
    openCommandWindow,
    closeCommandWindow,
    toggleCommandWindow
  }
}