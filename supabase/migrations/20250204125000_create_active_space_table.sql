-- Create active_spaces table to track which space is active for each user
CREATE TABLE active_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)  -- Ensures only one active space per user
);

-- Enable RLS on active_spaces
ALTER TABLE active_spaces ENABLE ROW LEVEL SECURITY;

-- RLS policies for active_spaces
CREATE POLICY "Users can view their own active space"
    ON active_spaces FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own active space"
    ON active_spaces FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can modify their own active space"
    ON active_spaces FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create function to update active space
CREATE OR REPLACE FUNCTION set_active_space(space_uuid UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    space_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the current user's ID
    v_user_id := auth.uid();
    
    RETURN QUERY
    INSERT INTO active_spaces (user_id, space_id)
    VALUES (v_user_id, space_uuid)
    ON CONFLICT (user_id)
    DO UPDATE SET
        space_id = EXCLUDED.space_id,
        updated_at = now()
    WHERE active_spaces.user_id = v_user_id
    RETURNING active_spaces.*;
END;
$$; 