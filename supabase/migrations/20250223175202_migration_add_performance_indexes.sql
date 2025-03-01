-- Indexes to improve overall database performance

-- Index for spaces table by user_id
CREATE INDEX IF NOT EXISTS idx_spaces_user_id 
ON spaces (user_id);

-- Index for active_spaces table by user_id
CREATE INDEX IF NOT EXISTS idx_active_spaces_user_id 
ON active_spaces (user_id);

-- Composite index for conversations with multiple conditions
CREATE INDEX IF NOT EXISTS idx_conversations_space_id_is_deleted_updated_at 
ON conversations (space_id, is_deleted, updated_at DESC);

-- Index for messages by conversation_id
-- This will speed up the getMessages queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at 
ON messages (conversation_id, created_at DESC);

-- Index for notifications by user_id and read status
-- This will optimize the getNotifications query
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_created_at 
ON notifications (user_id, is_read, created_at DESC);

-- Index to optimize space data lookup
CREATE INDEX IF NOT EXISTS idx_spaces_id_updated_at 
ON spaces (id, updated_at DESC);

-- Index to optimize conversation lookup by id
CREATE INDEX IF NOT EXISTS idx_conversations_id 
ON conversations (id);

-- If you have message search functionality
CREATE INDEX IF NOT EXISTS idx_messages_content_gin 
ON messages USING gin(to_tsvector('english', content));

-- Partial index for active conversations only, reducing index size
CREATE INDEX IF NOT EXISTS idx_active_conversations 
ON conversations (space_id, updated_at DESC) 
WHERE is_deleted = false;

-- Index for faster joins between spaces and conversations
CREATE INDEX IF NOT EXISTS idx_conversations_space_id
ON conversations (space_id);

-- If you frequently query by user_id and conversation_id together
CREATE INDEX IF NOT EXISTS idx_messages_user_id_conversation_id
ON messages (user_id, conversation_id);

-- Purpose: Add performance indexes for spaces, conversations, messages, and other tables to optimize query performance 