import { Command } from 'cmdk'
import { Plus, MessageSquare, Clock, MessageCircle, Edit2, Check, X } from 'lucide-react'
import { Conversation } from '@/types'
import { commandItemClass } from './command-item'
import { createConversation, setActiveConversation as setActiveConversationDB, createSpaceHistory, updateConversationTitle } from '@/app/actions'
import { useToast } from '@/hooks/use-toast'
import { useConversationStore } from '@/lib/stores/conversation-store'
import { CommandBadge } from './command-badge'
import { cn } from '@/lib/utils'
import { DeleteConversationDialog } from './delete-conversation-dialog'
import { useState, useRef, useEffect } from 'react'
import { Button } from './button'
import { Input } from './input'

interface ConversationsListProps {
  onConversationSelect: (conversationId: string) => Promise<void>
  spaceId: string
}

export function ConversationsList({
  onConversationSelect,
  spaceId
}: ConversationsListProps) {
  const { conversations, activeConversation, setActiveConversation } = useConversationStore()
  const { toast } = useToast()
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editedTitle, setEditedTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Filter out deleted conversations
  const nonDeletedConversations = conversations?.filter(conv => !conv.is_deleted) || []

  // Focus the input when editing starts
  useEffect(() => {
    if (editingConversationId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingConversationId])

  if (!conversations) {
    return (
      <div className="py-8 text-center">
        <MessageSquare className="w-6 h-6 text-white/20 mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-white/40">Loading conversations...</p>
      </div>
    );
  }

  if (nonDeletedConversations.length === 0) {
    return (
      <div className="py-8 text-center">
        <MessageSquare className="w-6 h-6 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/40">No conversations found</p>
        <p className="text-xs text-white/30 mt-1">Start a new conversation to begin</p>
      </div>
    );
  }

  const handleConversationSelect = async (conversationId: string) => {
    // Don't trigger selection if we're currently editing this conversation
    if (editingConversationId === conversationId) return;
    
    await setActiveConversationDB(conversationId);
    // Update local state as well
    const selectedConversation = conversations.find(conv => conv.id === conversationId);
    if (selectedConversation) {
      setActiveConversation(selectedConversation);
    }
    await onConversationSelect(conversationId);
  };

  const handleEditStart = (conversation: Conversation) => {
    setEditingConversationId(conversation.id)
    setEditedTitle(conversation.title || 'Untitled Conversation')
  }

  const handleEditCancel = () => {
    setEditingConversationId(null)
    setEditedTitle('')
  }

  const handleEditSave = async (conversationId: string) => {
    if (!editedTitle.trim()) {
      setEditedTitle('Untitled Conversation')
    }
    
    try {
      await updateConversationTitle(conversationId, editedTitle.trim())
      
      // Update local state
      const updatedConversations = conversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, title: editedTitle.trim() } 
          : conv
      )
      
      useConversationStore.getState().setConversations(updatedConversations)
      
      // Update active conversation if this is the active one
      if (activeConversation?.id === conversationId) {
        setActiveConversation({
          ...activeConversation,
          title: editedTitle.trim()
        })
      }
      
      toast({
        title: 'Conversation Updated',
        description: 'The conversation title has been updated.',
        variant: "success",
        duration: 2000,
      })
    } catch (error) {
      console.error('Error updating conversation title:', error)
      toast({
        title: 'Error',
        description: 'Failed to update conversation title.',
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setEditingConversationId(null)
    }
  }

  return (
    <>
      <Command.Group heading="Quick Actions" className="pb-4">
        <Command.Item
          value="create new conversation start conversation"
          onSelect={async () => {
            const newConversation = await createConversation(spaceId, 'New Conversation');
            if (newConversation) {
              await setActiveConversationDB(newConversation.id);
              // Update local state as well
              setActiveConversation(newConversation);
              await onConversationSelect(newConversation.id);

              // Record in space history
              await createSpaceHistory({
                spaceId,
                actionType: 'conversation_added',
                title: 'New Conversation Created',
                description: 'A new conversation was started.',
                metadata: { conversationId: newConversation.id }
              });

              // Show toast notification
              toast({
                title: 'New Conversation Created',
                description: 'You can start chatting right away.',
                variant: "success",
                duration: 2000,
              });
            }
          }}
          className={commandItemClass()}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-[#3ecfff]/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-[#3ecfff]" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white/90">New Conversation</div>
              <p className="text-sm text-white/50">Start a fresh chat with AI</p>
            </div>
          </div>
        </Command.Item>
      </Command.Group>

      <Command.Group heading="Recent Conversations" className="pb-4">
        {nonDeletedConversations.map((conversation) => (
          <Command.Item
            key={conversation.id}
            value={`conversation ${conversation.id} ${conversation.title}`}
            onSelect={() => handleConversationSelect(conversation.id)}
            className={commandItemClass(conversation.id === activeConversation?.id)}
            disabled={editingConversationId === conversation.id}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
                conversation.id === activeConversation?.id ? 'bg-[#3ecfff]/10' : 'bg-white/5 group-hover:bg-white/10'
              )}>
                <MessageCircle className={cn(
                  'w-4 h-4 transition-colors duration-300',
                  conversation.id === activeConversation?.id ? 'text-[#3ecfff]' : 'text-white/60 group-hover:text-white/80'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  {editingConversationId === conversation.id ? (
                    <div className="flex-1 flex items-center gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        ref={editInputRef}
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="h-7 text-sm bg-white/5 border-white/10 text-white/90 focus-visible:ring-white/20 focus-visible:ring-offset-0"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditSave(conversation.id)
                          } else if (e.key === 'Escape') {
                            handleEditCancel()
                          }
                        }}
                      />
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md text-white/60 hover:text-white/90 hover:bg-white/10"
                          onClick={() => handleEditSave(conversation.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md text-white/60 hover:text-white/90 hover:bg-white/10"
                          onClick={handleEditCancel}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-white/90 truncate">
                        {conversation.title || 'Untitled Conversation'}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        {conversation.id === activeConversation?.id && (
                          <CommandBadge variant="active">Active</CommandBadge>
                        )}
                        {conversation.messageCount !== undefined && conversation.messageCount > 0 && (
                          <CommandBadge variant="count">{conversation.messageCount} messages</CommandBadge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 w-6 h-6 p-1 rounded-md flex items-center justify-center group text-white/60 hover:text-white/90 hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditStart(conversation)
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {conversations.length > 1 && (
                          <DeleteConversationDialog 
                            conversationId={conversation.id} 
                            conversationTitle={conversation.title || 'Untitled Conversation'} 
                            spaceId={spaceId}
                            onConversationSelect={handleConversationSelect}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
                {!editingConversationId && conversation.lastMessage && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">{conversation.lastMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </Command.Item>
        ))}
      </Command.Group>
    </>
  )
}