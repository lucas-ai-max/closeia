-- ============================================================================
-- MIGRATION 019: EMERGENCY SECURITY FIX - RLS POLICIES + ADMIN SYSTEM
-- ============================================================================
-- Applied and tested in production on 2026-03-28.
-- Key learnings:
--   - Subqueries on same table in policies cause issues (use SECURITY DEFINER functions)
--   - auth.users is NOT accessible to authenticated role (use auth.jwt()->>'email')
--   - Always use get_auth_user_org_id() (SECURITY DEFINER) instead of inline subqueries
-- ============================================================================

-- ============================================================================
-- STEP 1: ADMIN SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_service_role" ON admin_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_users_self_check" ON admin_users
    FOR SELECT TO authenticated
    USING (email = (auth.jwt()->>'email'));

INSERT INTO admin_users (email) VALUES
    ('felipeoliveiraa1@hotmail.com'),
    ('lucastria01@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- STEP 2: HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_auth_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, auth;

-- ============================================================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE objection_success_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_hours_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: PROFILES
-- ============================================================================
CREATE POLICY "profiles_read_self" ON profiles
    FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_read_org" ON profiles
    FOR SELECT TO authenticated USING (organization_id = get_auth_user_org_id());

CREATE POLICY "profiles_read_admin" ON profiles
    FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "profiles_update_self" ON profiles
    FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_insert_self" ON profiles
    FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_service_role" ON profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 5: ORGANIZATIONS
-- ============================================================================
CREATE POLICY "org_read_own" ON organizations
    FOR SELECT TO authenticated USING (id = get_auth_user_org_id());

CREATE POLICY "org_read_admin" ON organizations
    FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "org_update_own" ON organizations
    FOR UPDATE TO authenticated USING (id = get_auth_user_org_id());

CREATE POLICY "org_insert" ON organizations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "org_service_role" ON organizations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 6: CALLS & CALL_SUMMARIES
-- ============================================================================
CREATE POLICY "calls_select" ON calls
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR organization_id = get_auth_user_org_id() OR is_admin());

CREATE POLICY "calls_insert" ON calls
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "calls_update" ON calls
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR organization_id = get_auth_user_org_id());

CREATE POLICY "calls_service_role" ON calls
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "summaries_select" ON call_summaries
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE id = call_summaries.call_id
            AND (user_id = auth.uid() OR organization_id = get_auth_user_org_id())
        )
        OR is_admin()
    );

CREATE POLICY "summaries_service_role" ON call_summaries
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 7: SCRIPTS & COACHES
-- ============================================================================
CREATE POLICY "scripts_select" ON scripts
    FOR SELECT TO authenticated
    USING (organization_id = get_auth_user_org_id() OR organization_id IS NULL OR is_admin());

CREATE POLICY "scripts_manage" ON scripts
    FOR ALL TO authenticated
    USING (organization_id = get_auth_user_org_id())
    WITH CHECK (organization_id = get_auth_user_org_id());

CREATE POLICY "scripts_service_role" ON scripts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "coaches_select" ON coaches
    FOR SELECT TO authenticated
    USING (organization_id = get_auth_user_org_id() OR is_admin());

CREATE POLICY "coaches_manage" ON coaches
    FOR ALL TO authenticated
    USING (organization_id = get_auth_user_org_id())
    WITH CHECK (organization_id = get_auth_user_org_id());

CREATE POLICY "coaches_service_role" ON coaches
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 8: BILLING
-- ============================================================================
CREATE POLICY "billing_plans_select" ON billing_plans
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "billing_plans_service_role" ON billing_plans
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "billing_orders_select" ON billing_orders
    FOR SELECT TO authenticated
    USING (organization_id = get_auth_user_org_id() OR is_admin());

CREATE POLICY "billing_orders_insert" ON billing_orders
    FOR INSERT TO authenticated WITH CHECK (organization_id = get_auth_user_org_id());

CREATE POLICY "billing_orders_service_role" ON billing_orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "billing_subs_select" ON billing_subscriptions
    FOR SELECT TO authenticated
    USING (organization_id = get_auth_user_org_id() OR is_admin());

CREATE POLICY "billing_subs_service_role" ON billing_subscriptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "billing_payments_select" ON billing_payments
    FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "billing_payments_service_role" ON billing_payments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "billing_customers_select" ON billing_customers
    FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "billing_customers_service_role" ON billing_customers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "webhook_events_select" ON billing_webhook_events
    FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "webhook_events_service_role" ON billing_webhook_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 9: EXTRA HOURS, FEEDBACK, AI LOGS
-- ============================================================================
CREATE POLICY "extra_hours_select" ON extra_hours_purchases
    FOR SELECT TO authenticated
    USING (organization_id = get_auth_user_org_id() OR is_admin());

CREATE POLICY "extra_hours_service_role" ON extra_hours_purchases
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "feedback_select" ON feedback
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "feedback_insert" ON feedback
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_update" ON feedback
    FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "feedback_service_role" ON feedback
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "ai_logs_select" ON ai_usage_logs
    FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "ai_logs_service_role" ON ai_usage_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 10: AFFILIATES
-- ============================================================================
CREATE POLICY "affiliates_select" ON affiliates
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "affiliates_public_register" ON affiliates
    FOR INSERT TO anon WITH CHECK (status = 'pending');

CREATE POLICY "affiliates_service_role" ON affiliates
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "referrals_select" ON affiliate_referrals
    FOR SELECT TO authenticated
    USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "referrals_service_role" ON affiliate_referrals
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "commissions_select" ON affiliate_commissions
    FOR SELECT TO authenticated
    USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "commissions_service_role" ON affiliate_commissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "payouts_select" ON affiliate_payouts
    FOR SELECT TO authenticated
    USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "payouts_insert" ON affiliate_payouts
    FOR INSERT TO authenticated
    WITH CHECK (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "payouts_service_role" ON affiliate_payouts
    FOR ALL TO service_role USING (true) WITH CHECK (true);
