-- Create active_conversations table
CREATE TABLE active_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on active_conversations
ALTER TABLE active_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for active_conversations
CREATE POLICY "Users can view their own active conversation"
    ON active_conversations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own active conversation"
    ON active_conversations FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own active conversation"
    ON active_conversations FOR DELETE
    USING (user_id = auth.uid());
