-- Migration to add full-text search capabilities to the messages table
-- This enhances search performance using PostgreSQL's full-text search features

-- Add a search_vector column for storing precomputed tsvector data
ALTER TABLE messages ADD COLUMN search_vector tsvector;

-- Populate the search_vector column for existing messages
UPDATE messages SET search_vector = to_tsvector('english', content);

-- Create a GIN index for fast full-text search operations
-- GIN indexes are optimized for scenarios where values being indexed 
-- appear many times (like words in text documents)
CREATE INDEX messages_search_idx ON messages USING GIN (search_vector);

-- Create a function for automatically updating the search_vector column
CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.content);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the search_vector on insert or update
CREATE TRIGGER messages_search_vector_update
BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION messages_search_vector_update();

-- Add useful search functions that leverage the search_vector

-- 1. Search within a single conversation
CREATE OR REPLACE FUNCTION search_conversation_messages(
  conversation_uuid UUID,
  search_query TEXT,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  content TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  ts_rank REAL
) AS $$
BEGIN
  -- Convert the search query to tsquery format
  -- Uses plainto_tsquery for user-friendly input handling
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.role,
    m.created_at,
    ts_rank(m.search_vector, plainto_tsquery('english', search_query)) AS rank
  FROM messages m
  WHERE 
    m.conversation_id = conversation_uuid
    AND m.is_deleted = false
    AND m.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Search across all conversations in a space
CREATE OR REPLACE FUNCTION search_space_messages(
  space_uuid UUID,
  search_query TEXT,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  content TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  ts_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.role,
    m.created_at,
    ts_rank(m.search_vector, plainto_tsquery('english', search_query)) AS rank
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE 
    c.space_id = space_uuid
    AND m.is_deleted = false
    AND c.is_deleted = false
    AND m.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Search across all spaces owned by the user
CREATE OR REPLACE FUNCTION search_all_user_messages(
  search_query TEXT,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  content TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  ts_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.role,
    m.created_at,
    ts_rank(m.search_vector, plainto_tsquery('english', search_query)) AS rank
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  JOIN spaces s ON c.space_id = s.id
  WHERE 
    s.user_id = auth.uid()
    AND m.is_deleted = false
    AND c.is_deleted = false
    AND s.is_deleted = false
    AND m.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to the authenticated role for these functions
GRANT EXECUTE ON FUNCTION search_conversation_messages(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_space_messages(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_all_user_messages(TEXT, INT) TO authenticated;

-- Make sure RLS policies still apply to the search_vector column
GRANT ALL ON FUNCTION messages_search_vector_update() TO authenticated;
GRANT ALL ON FUNCTION messages_search_vector_update() TO service_role;

-- Migration completed 