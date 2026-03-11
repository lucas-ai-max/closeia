-- Add recording URL columns to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url_lead TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url_seller TEXT;

-- Create storage bucket for call recordings (if using Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read their org's recordings
CREATE POLICY "Users can read own org recordings"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'call-recordings'
    AND auth.role() = 'authenticated'
);

-- Allow service role to insert recordings
CREATE POLICY "Service role can insert recordings"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'call-recordings'
);
