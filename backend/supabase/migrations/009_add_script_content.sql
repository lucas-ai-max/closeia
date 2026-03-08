-- Add script_content TEXT column for storing organized script text (extracted from PDF uploads)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS script_content TEXT;
