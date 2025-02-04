-- Create complete schema for Spatial app
-- Timestamp: 2025-02-04T12:48:00-07:00

-- USERS TABLE: Supabase Auth will manage user accounts.
-- No changes needed; we'll use `auth.users`.

-- SPACES TABLE: Metadata for spaces.
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on spaces
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- RLS policies for spaces
CREATE POLICY "Users can view their own spaces"
    ON spaces FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own spaces"
    ON spaces FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own spaces"
    ON spaces FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own spaces"
    ON spaces FOR DELETE
    USING (user_id = auth.uid());

-- CONVERSATIONS TABLE: Each conversation is part of a space.
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view conversations in their spaces"
    ON conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = conversations.space_id
            AND spaces.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations in their spaces"
    ON conversations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = space_id
            AND spaces.user_id = auth.uid()
        )
    );

-- MESSAGES TABLE: Each message entry contains both user and assistant messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    assistant_message TEXT NOT NULL,
    parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view messages in their spaces"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM spaces s
            JOIN conversations c ON c.space_id = s.id
            WHERE c.id = messages.conversation_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their spaces"
    ON messages FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1
            FROM spaces s
            JOIN conversations c ON c.space_id = s.id
            WHERE c.id = conversation_id
            AND s.user_id = auth.uid()
        )
    );

-- SPACE_USER_RELATIONS (Optional for shared spaces).
CREATE TABLE space_user_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on space_user_relations
ALTER TABLE space_user_relations ENABLE ROW LEVEL SECURITY;

-- Add indexes for better query performance
CREATE INDEX idx_spaces_user_id ON spaces(user_id);
CREATE INDEX idx_conversations_space_id ON conversations(space_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_parent_id ON messages(parent_message_id);
CREATE INDEX idx_space_user_relations_space_id ON space_user_relations(space_id);
CREATE INDEX idx_space_user_relations_user_id ON space_user_relations(user_id);

-- Create a function to get the latest messages in a conversation
CREATE OR REPLACE FUNCTION get_conversation_messages(conversation_uuid UUID)
RETURNS TABLE (
    id UUID,
    conversation_id UUID,
    user_id UUID,
    user_message TEXT,
    assistant_message TEXT,
    parent_message_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        m.user_id,
        m.user_message,
        m.assistant_message,
        m.parent_message_id,
        m.created_at,
        m.updated_at
    FROM messages m
    WHERE m.conversation_id = conversation_uuid
    AND m.is_deleted = FALSE
    ORDER BY m.created_at ASC;
END;
$$;
