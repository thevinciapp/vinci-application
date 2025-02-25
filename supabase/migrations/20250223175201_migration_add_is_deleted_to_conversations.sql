ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
UPDATE conversations SET is_deleted = FALSE WHERE is_deleted IS NULL;
