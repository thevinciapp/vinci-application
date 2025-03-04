-- This migration updates the full-text search functions to support partial word matching
-- and improves multilingual search capabilities

-- First, update the trigger function to use a more language-agnostic tokenization
CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
BEGIN
  -- Use 'simple' configuration instead of 'english' for better multilingual support
  -- 'simple' doesn't do stemming or stop word removal, so it works better for mixed languages
  NEW.search_vector := to_tsvector('simple', NEW.content);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Update existing message search_vectors using the simple configuration
UPDATE messages SET search_vector = to_tsvector('simple', content);

-- 1. Update the conversation messages search function
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
DECLARE
  modified_query TEXT;
BEGIN
  -- Process the query to enable partial word matching
  modified_query := string_agg(lexeme || ':*', ' & ') 
    FROM unnest(string_to_array(search_query, ' ')) AS lexeme
    WHERE length(lexeme) > 0;
  
  IF modified_query IS NULL OR modified_query = '' THEN
    -- Handle empty query or all stopwords
    modified_query := search_query || ':*';
  END IF;
  
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.role,
    m.created_at,
    ts_rank(m.search_vector, to_tsquery('simple', modified_query)) AS rank
  FROM messages m
  WHERE 
    m.conversation_id = conversation_uuid
    AND m.is_deleted = false
    AND (
      -- Use the modified query with prefix matching
      m.search_vector @@ to_tsquery('simple', modified_query)
      -- Also include direct content matching for more flexibility
      OR m.content ILIKE '%' || search_query || '%'
    )
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the space messages search function
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
DECLARE
  modified_query TEXT;
BEGIN
  -- Process the query to enable partial word matching
  modified_query := string_agg(lexeme || ':*', ' & ') 
    FROM unnest(string_to_array(search_query, ' ')) AS lexeme
    WHERE length(lexeme) > 0;
  
  IF modified_query IS NULL OR modified_query = '' THEN
    -- Handle empty query or all stopwords
    modified_query := search_query || ':*';
  END IF;
  
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.role,
    m.created_at,
    ts_rank(m.search_vector, to_tsquery('simple', modified_query)) AS rank
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE 
    c.space_id = space_uuid
    AND m.is_deleted = false
    AND c.is_deleted = false
    AND (
      -- Use the modified query with prefix matching
      m.search_vector @@ to_tsquery('simple', modified_query)
      -- Also include direct content matching for more flexibility
      OR m.content ILIKE '%' || search_query || '%'
    )
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the all user messages search function
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
DECLARE
  modified_query TEXT;
BEGIN
  -- Process the query to enable partial word matching
  modified_query := string_agg(lexeme || ':*', ' & ') 
    FROM unnest(string_to_array(search_query, ' ')) AS lexeme
    WHERE length(lexeme) > 0;
  
  IF modified_query IS NULL OR modified_query = '' THEN
    -- Handle empty query or all stopwords
    modified_query := search_query || ':*';
  END IF;
  
  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.content,
    m.role,
    m.created_at,
    ts_rank(m.search_vector, to_tsquery('simple', modified_query)) AS rank
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  JOIN spaces s ON c.space_id = s.id
  WHERE 
    s.user_id = auth.uid()
    AND m.is_deleted = false
    AND c.is_deleted = false
    AND s.is_deleted = false
    AND (
      -- Use the modified query with prefix matching
      m.search_vector @@ to_tsquery('simple', modified_query)
      -- Also include direct content matching for more flexibility
      OR m.content ILIKE '%' || search_query || '%'
    )
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
