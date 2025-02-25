-- Create space history schema
-- Timestamp: 2025-02-23T17:52:00-07:00

-- Create space action types enum
CREATE TYPE space_action_type AS ENUM (
    'created',
    'deleted',
    'updated',
    'model_changed',
    'conversation_added',
    'conversation_deleted'
);

-- Create space history table
CREATE TABLE space_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type space_action_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on space history
ALTER TABLE space_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for space history
CREATE POLICY "Users can view history for spaces they have access to"
    ON space_history FOR SELECT
    USING (
        user_id = auth.uid() OR 
        space_id IN (
            SELECT id FROM spaces 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create history entries for their spaces"
    ON space_history FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        space_id IN (
            SELECT id FROM spaces 
            WHERE user_id = auth.uid()
        )
    );

-- Create indexes for faster lookups
CREATE INDEX space_history_space_id_idx ON space_history(space_id);
CREATE INDEX space_history_user_id_idx ON space_history(user_id);
CREATE INDEX space_history_created_at_idx ON space_history(created_at DESC);
