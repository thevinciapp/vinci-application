import { useCallback, useState } from 'react'

export function useCommandWindow() {
  const [showSpaces, setShowSpaces] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const [showConversations, setShowConversations] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const openCommandWindow = useCallback((options: { 
    withSpaces?: boolean
    withModels?: boolean 
    withConversations?: boolean
  } = {}) => {
    setIsOpen(true)
    setShowSpaces(!!options.withSpaces)
    setShowModels(!!options.withModels)
    setShowConversations(!!options.withConversations)
  }, [])

  const closeCommandWindow = useCallback(() => {
    setIsOpen(false)
    setShowSpaces(false)
    setShowModels(false)
    setShowConversations(false)
  }, [])

  const toggleCommandWindow = useCallback((options: {
    withSpaces?: boolean
    withModels?: boolean
    withConversations?: boolean
  } = {}) => {
    setIsOpen((prevIsOpen) => {
      const nextIsOpen = !prevIsOpen
      setShowSpaces(nextIsOpen && !!options.withSpaces)
      setShowModels(nextIsOpen && !!options.withModels)
      setShowConversations(nextIsOpen && !!options.withConversations)
      return nextIsOpen
    })
  }, [])

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