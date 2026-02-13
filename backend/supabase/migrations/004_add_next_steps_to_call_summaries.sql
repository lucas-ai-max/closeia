-- Add next_steps column to call_summaries table
-- This stores AI-generated action items from post-call analysis
ALTER TABLE call_summaries ADD COLUMN IF NOT EXISTS next_steps text[];
