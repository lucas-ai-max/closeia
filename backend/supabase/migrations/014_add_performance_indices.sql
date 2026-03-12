-- Performance indices for frequently queried columns
-- These prevent full table scans on listing queries

CREATE INDEX IF NOT EXISTS idx_calls_organization_id ON calls(organization_id);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at);
CREATE INDEX IF NOT EXISTS idx_calls_org_started ON calls(organization_id, started_at);
CREATE INDEX IF NOT EXISTS idx_call_summaries_call_id ON call_summaries(call_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_call_id ON ai_usage_logs(call_id);
