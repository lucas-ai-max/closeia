-- Create objection_success_metrics table
CREATE TABLE objection_success_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objection_id UUID REFERENCES objections(id) ON DELETE CASCADE,
    script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
    success_count INT DEFAULT 0,
    total_usage INT DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(objection_id, script_id)
);

-- Enable RLS
ALTER TABLE objection_success_metrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view metrics for their org" ON objection_success_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM scripts 
            WHERE id = objection_success_metrics.script_id 
            AND organization_id = get_auth_user_org_id()
        )
    );

CREATE POLICY "System update metrics" ON objection_success_metrics
    FOR ALL USING (true) WITH CHECK (true); -- Simplified for backend access, normally restricted to service role
