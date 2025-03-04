-- Migration to add chat_mode and chat_mode_config columns to spaces table
ALTER TABLE "spaces" ADD COLUMN chat_mode TEXT NOT NULL DEFAULT 'ask';
ALTER TABLE "spaces" ADD COLUMN chat_mode_config JSONB DEFAULT '{"tools": []}';
