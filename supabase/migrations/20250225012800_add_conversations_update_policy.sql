CREATE POLICY "Users can update conversations in their spaces"
    ON conversations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = conversations.space_id
            AND spaces.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = conversations.space_id
            AND spaces.user_id = auth.uid()
        )
    );