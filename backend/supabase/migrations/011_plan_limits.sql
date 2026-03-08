-- Plan limits and features configuration
-- This migration adds feature flags and limits to billing_plans

-- Ensure is_active column exists on profiles (may be missing in some environments)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add feature columns to billing_plans
ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Insert/update plan definitions with limits
INSERT INTO billing_plans (slug, name, amount_cents, currency, interval, max_sellers, max_call_hours, extra_hour_cents, features)
VALUES
  ('STARTER', 'Starter', 39700, 'BRL', 'month', 2, 15, 800,
   '{"coaching_ai": true, "objection_detection": true, "spin_indicator": true, "call_history": true, "post_call_summary": true, "basic_dashboard": true, "advanced_analytics": false, "seller_ranking": false, "manager_dashboard": false, "reprocess_analysis": false, "live_command_center": false, "manager_whisper": false, "advanced_kpis": false, "team_management": false}'::jsonb),
  ('PRO', 'Pro', 89700, 'BRL', 'month', 5, 60, 700,
   '{"coaching_ai": true, "objection_detection": true, "spin_indicator": true, "call_history": true, "post_call_summary": true, "basic_dashboard": true, "advanced_analytics": true, "seller_ranking": true, "manager_dashboard": true, "reprocess_analysis": true, "live_command_center": false, "manager_whisper": false, "advanced_kpis": false, "team_management": false}'::jsonb),
  ('TEAM', 'Team', 179700, 'BRL', 'month', 10, 150, 600,
   '{"coaching_ai": true, "objection_detection": true, "spin_indicator": true, "call_history": true, "post_call_summary": true, "basic_dashboard": true, "advanced_analytics": true, "seller_ranking": true, "manager_dashboard": true, "reprocess_analysis": true, "live_command_center": true, "manager_whisper": true, "advanced_kpis": true, "team_management": true}'::jsonb),
  ('ENTERPRISE', 'Enterprise', 399700, 'BRL', 'month', 50, 400, 500,
   '{"coaching_ai": true, "objection_detection": true, "spin_indicator": true, "call_history": true, "post_call_summary": true, "basic_dashboard": true, "advanced_analytics": true, "seller_ranking": true, "manager_dashboard": true, "reprocess_analysis": true, "live_command_center": true, "manager_whisper": true, "advanced_kpis": true, "team_management": true, "custom_integrations": true, "priority_support": true, "dedicated_sla": true}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  max_sellers = EXCLUDED.max_sellers,
  max_call_hours = EXCLUDED.max_call_hours,
  extra_hour_cents = EXCLUDED.extra_hour_cents,
  features = EXCLUDED.features,
  updated_at = now();

-- Create a view for easy access to organization usage stats
-- Using COALESCE for is_active to handle NULL values
CREATE OR REPLACE VIEW organization_usage AS
SELECT
  o.id as organization_id,
  o.plan,
  o.name as organization_name,
  bp.max_sellers,
  bp.max_call_hours,
  bp.features,
  COALESCE(seller_count.count, 0) as current_sellers,
  COALESCE(call_hours.total_hours, 0) as current_call_hours_this_month
FROM organizations o
LEFT JOIN billing_plans bp ON bp.slug = o.plan
LEFT JOIN (
  SELECT organization_id, COUNT(*) as count
  FROM profiles
  WHERE role = 'SELLER' AND COALESCE(is_active, true) = true
  GROUP BY organization_id
) seller_count ON seller_count.organization_id = o.id
LEFT JOIN (
  SELECT
    organization_id,
    ROUND(COALESCE(SUM(duration_seconds) / 3600.0, 0), 2) as total_hours
  FROM calls
  WHERE
    started_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND started_at < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
  GROUP BY organization_id
) call_hours ON call_hours.organization_id = o.id;

-- Grant access to the view
GRANT SELECT ON organization_usage TO authenticated;
