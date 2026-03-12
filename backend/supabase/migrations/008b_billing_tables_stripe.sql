-- Billing tables for Stripe integration.
-- Prefix billing_ to avoid conflicts with other domains.

-- Billing customers (one per organization in Stripe)
CREATE TABLE IF NOT EXISTS billing_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id),
    UNIQUE(stripe_customer_id)
);

-- Plan catalog (one-time or recurring)
CREATE TABLE IF NOT EXISTS billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    amount_cents INT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    interval TEXT CHECK (interval IS NULL OR interval IN ('month', 'year')),
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders (one-time payment or checkout session)
CREATE TABLE IF NOT EXISTS billing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES billing_plans(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'canceled', 'refunded')),
    amount_cents INT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    order_code TEXT NOT NULL UNIQUE,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_billing_orders_org ON billing_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_order_code ON billing_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_billing_orders_stripe_session ON billing_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_status ON billing_orders(status);

-- Subscriptions (recurring billing)
CREATE TABLE IF NOT EXISTS billing_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES billing_plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'canceled', 'past_due', 'trialing')),
    stripe_subscription_id TEXT UNIQUE,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_org ON billing_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_stripe ON billing_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status ON billing_subscriptions(status);

-- Payments (charges linked to order and/or subscription)
CREATE TABLE IF NOT EXISTS billing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES billing_orders(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES billing_subscriptions(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('card', 'boleto', 'pix', 'bank_transfer', 'other')),
    stripe_charge_id TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_billing_payments_ref CHECK (order_id IS NOT NULL OR subscription_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_billing_payments_order ON billing_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_sub ON billing_payments(subscription_id);

-- Webhook events (deduplication and audit)
CREATE TABLE IF NOT EXISTS billing_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    payload JSONB,
    signature_ok BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_event_id ON billing_webhook_events(event_id);

-- Triggers for updated_at
CREATE TRIGGER update_billing_customers_modtime BEFORE UPDATE ON billing_customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_billing_plans_modtime BEFORE UPDATE ON billing_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_billing_orders_modtime BEFORE UPDATE ON billing_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_billing_subscriptions_modtime BEFORE UPDATE ON billing_subscriptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_billing_payments_modtime BEFORE UPDATE ON billing_payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
