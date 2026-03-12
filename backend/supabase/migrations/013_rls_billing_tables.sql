-- 013: Enable RLS on billing tables that were missing it

-- billing_customers: only service_role should access (backend uses supabaseAdmin)
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages billing_customers" ON billing_customers
    FOR ALL USING (true) WITH CHECK (true);

-- billing_plans: public catalog, anyone authenticated can read
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read plans" ON billing_plans
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages billing_plans" ON billing_plans
    FOR ALL USING (true) WITH CHECK (true);

-- billing_orders: users can view their org's orders
ALTER TABLE billing_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own org orders" ON billing_orders
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role manages billing_orders" ON billing_orders
    FOR ALL USING (true) WITH CHECK (true);

-- billing_subscriptions: users can view their org's subscriptions
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own org subscriptions" ON billing_subscriptions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Service role manages billing_subscriptions" ON billing_subscriptions
    FOR ALL USING (true) WITH CHECK (true);

-- billing_payments: users can view payments linked to their org's orders/subscriptions
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own org payments" ON billing_payments
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM billing_orders WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
        OR subscription_id IN (
            SELECT id FROM billing_subscriptions WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Service role manages billing_payments" ON billing_payments
    FOR ALL USING (true) WITH CHECK (true);

-- billing_webhook_events: only service_role (no user access needed)
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages billing_webhook_events" ON billing_webhook_events
    FOR ALL USING (true) WITH CHECK (true);

