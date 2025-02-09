ALTER TABLE "spaces" ADD COLUMN model TEXT NOT NULL DEFAULT 'deepseek-r1-distill-llama-70b';
ALTER TABLE "spaces" ADD COLUMN provider text NOT NULL DEFAULT 'groq';