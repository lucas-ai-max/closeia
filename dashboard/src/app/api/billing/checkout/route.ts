import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, type CheckoutMode } from '@/lib/stripe';
import { z } from 'zod';

const BodySchema = z.object({
  mode: z.enum(['payment', 'subscription']).default('subscription'),
  priceId: z.string().optional(),
  planSlug: z.string().optional(),
  planId: z.string().uuid().optional(),
  name: z.string().min(1).max(64).optional(),
  amountCents: z.number().int().min(1).optional(),
  currency: z.string().length(3).default('brl'),
});

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session and persists an order in the DB.
 * Accepts planSlug (e.g. "PRO") to auto-resolve priceId from billing_plans.
 * Returns checkoutUrl and orderId. Requires authenticated user with organization_id.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, full_name, email')
      .eq('id', user.id)
      .single();

    const organizationId = (profile as { organization_id: string | null } | null)
      ?.organization_id ?? null;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Profile must have an organization to create checkout' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let { mode, priceId, planSlug, planId, name, amountCents, currency } = parsed.data;
    let trialDays: number | undefined;

    if (planSlug && !priceId) {
      const { data: planRow } = await supabase
        .from('billing_plans')
        .select('id, stripe_price_id, amount_cents, name, interval, slug')
        .eq('slug', planSlug)
        .maybeSingle();

      const plan = planRow as {
        id: string;
        stripe_price_id: string | null;
        amount_cents: number;
        name: string;
        interval: string | null;
        slug: string;
      } | null;

      if (!plan) {
        return NextResponse.json({ error: `Plan "${planSlug}" not found` }, { status: 404 });
      }

      planId = plan.id;
      amountCents = plan.amount_cents;
      name = plan.name;

      if (plan.stripe_price_id) {
        priceId = plan.stripe_price_id;
      }

      if (plan.interval) {
        mode = 'subscription';
      }

      if (plan.slug === 'STARTER') {
        trialDays = 7;
      }
    }

    if (!priceId && !amountCents) {
      return NextResponse.json(
        { error: 'Either priceId, planSlug, or amountCents is required' },
        { status: 400 }
      );
    }

    const customerEmail = (profile as { email: string | null })?.email ?? user.email ?? '';
    const orderCode = crypto.randomUUID();
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const productName = name ?? (mode === 'subscription' ? 'Assinatura' : 'Pagamento único');

    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [{
          price_data: {
            currency,
            product_data: { name: productName },
            unit_amount: amountCents!,
            ...(mode === 'subscription' ? { recurring: { interval: 'month' as const } } : {}),
          },
          quantity: 1,
        }];

    // Create order FIRST (draft status) to ensure DB consistency before Stripe charges
    const { data: orderRow, error: insertError } = await supabase
      .from('billing_orders')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        plan_id: planId ?? null,
        status: 'draft',
        amount_cents: amountCents ?? 0,
        currency,
        order_code: orderCode,
        metadata: {},
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[BILLING_CHECKOUT] Insert order failed:', insertError);
      return NextResponse.json(
        { error: 'Failed to save order' },
        { status: 500 }
      );
    }

    // Create Stripe session AFTER order exists in DB
    let sessionResult;
    try {
      sessionResult = await createCheckoutSession({
        mode: mode as CheckoutMode,
        customerEmail,
        lineItems,
        successUrl: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/billing/cancel`,
        clientReferenceId: organizationId,
        metadata: {
          organization_id: organizationId,
          user_id: user.id,
          order_code: orderCode,
          plan_id: planId ?? '',
          plan_slug: planSlug ?? '',
        },
        trialPeriodDays: trialDays,
      });
    } catch (stripeErr) {
      // Stripe failed — mark order as failed
      await supabase
        .from('billing_orders')
        .update({ status: 'failed' })
        .eq('id', orderRow.id);
      throw stripeErr;
    }

    // Update order with Stripe session ID and set status to pending
    await supabase
      .from('billing_orders')
      .update({
        stripe_session_id: sessionResult.sessionId,
        status: 'pending',
      })
      .eq('id', orderRow.id);

    return NextResponse.json({
      checkoutUrl: sessionResult.checkoutUrl,
      orderId: orderRow.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json(
        { error: 'Billing is not configured (missing STRIPE_SECRET_KEY)' },
        { status: 503 }
      );
    }
    console.error('[BILLING_CHECKOUT] Error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
