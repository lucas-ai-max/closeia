-- Migration: Objection Success Metrics (Feedback Loop - Moat #1)
-- Track which objection responses lead to successful conversions

-- Create table for success metrics
CREATE TABLE objection_success_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objection_id UUID REFERENCES objections(id) ON DELETE CASCADE NOT NULL,
    script_id UUID REFERENCES scripts(id) ON DELETE CASCADE NOT NULL,
    success_count INT DEFAULT 0,
    total_usage INT DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(objection_id, script_id)
);

-- Indexes for fast queries
CREATE INDEX idx_objection_metrics_objection ON objection_success_metrics(objection_id);
CREATE INDEX idx_objection_metrics_script ON objection_success_metrics(script_id);
-- Index for sorting by success rate
CREATE INDEX idx_objection_metrics_rate ON objection_success_metrics((success_count::float / NULLIF(total_usage, 0)));

-- Enable RLS
ALTER TABLE objection_success_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view metrics for their organization's scripts
-- Simplified to avoid dependency on get_auth_user_org_id()
CREATE POLICY "Users view metrics for org scripts" ON objection_success_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scripts s
            JOIN profiles p ON p.organization_id = s.organization_id
            WHERE s.id = objection_success_metrics.script_id 
            AND p.id = auth.uid()
        )
    );

-- Policy: Service role can manage metrics (backend uses service role)
CREATE POLICY "Service role can manage metrics" ON objection_success_metrics
    FOR ALL USING (auth.role() = 'service_role');

-- Note: last_updated_at is managed by application code in ObjectionSuccessTracker
-- No trigger needed since we explicitly set it in the upsert operation

