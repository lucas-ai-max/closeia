DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'external_id') THEN
        ALTER TABLE public.calls ADD COLUMN external_id text;
    END IF;
END $$;
