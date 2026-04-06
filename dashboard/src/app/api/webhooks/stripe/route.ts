import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { constructWebhookEvent, type Stripe } from '@/lib/stripe';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

/**
 * POST /api/webhooks/stripe
 * Receives Stripe webhook events. Public (no user auth).
 * Deduplicates by event ID. Updates billing_orders / billing_subscriptions.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('[WEBHOOK_STRIPE] STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown verification error';
      console.error('[WEBHOOK_STRIPE] Signature verification failed:', message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Note: replay protection is handled by Stripe's signature verification
    // (timestamp tolerance) + our event deduplication by event ID below.
    // No additional age check needed — Stripe legitimately retries old events.

    const supabase = createAdminClient();
    const eventId = event.id;
    const eventType = event.type;

    const { data: existing } = await supabase
      .from('billing_webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { error: insertEventError } = await supabase.from('billing_webhook_events').insert({
      event_id: eventId,
      type: eventType,
      received_at: new Date().toISOString(),
      payload: event as unknown as Record<string, unknown>,
      signature_ok: true,
    });

    if (insertEventError) {
      if (insertEventError.code === '23505') {
        return NextResponse.json({ received: true }, { status: 200 });
      }
      console.error('[WEBHOOK_STRIPE] Insert event failed:', insertEventError);
      return NextResponse.json({ error: 'Failed to store event' }, { status: 500 });
    }

    await handleStripeEvent(supabase, event);

    await supabase
      .from('billing_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('event_id', eventId);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error('[WEBHOOK_STRIPE] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

async function handleStripeEvent(supabase: SupabaseAdmin, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
      break;
    default:
      console.log(`[WEBHOOK_STRIPE] Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session
): Promise<void> {
  const orderCode = session.metadata?.order_code;
  const organizationId = session.metadata?.organization_id ?? session.client_reference_id;
  const stripeCustomerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id ?? null;

  if (orderCode) {
    const { error: orderUpdateError } = await supabase
      .from('billing_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('order_code', orderCode)
      .in('status', ['draft', 'pending']);
    console.log('[WEBHOOK_STRIPE] Order update:', { orderCode, error: orderUpdateError });
  }

  if (session.mode === 'subscription' && session.subscription) {
    const stripeSubscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;
    const planId = session.metadata?.plan_id || null;
    const { error: subError } = await supabase.from('billing_subscriptions').upsert(
      {
        organization_id: organizationId!,
        plan_id: planId,
        status: 'active',
        stripe_subscription_id: stripeSubscriptionId,
        current_period_start: new Date().toISOString(),
        metadata: {},
      },
      { onConflict: 'stripe_subscription_id' }
    );
    console.log('[WEBHOOK_STRIPE] Subscription upsert:', { stripeSubscriptionId, planId, error: subError });
  }

  // Handle extra hours purchase
  if (session.metadata?.type === 'extra_hours') {
    await handleExtraHoursPurchase(supabase, session);
    return;
  }

  if (organizationId) {
    const resolvedSlug = await resolvePlanSlug(supabase, session.metadata?.plan_id || null);
    const planSlug = resolvedSlug || session.metadata?.plan_slug || null;
    console.log('[WEBHOOK_STRIPE] Resolved plan slug:', { planId: session.metadata?.plan_id, metadataSlug: session.metadata?.plan_slug, planSlug });
    const { error: orgError } = await supabase
      .from('organizations')
      .update({
        ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
        ...(session.mode === 'subscription' && session.subscription
          ? {
              stripe_subscription_id: typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription.id,
            }
          : {}),
        ...(planSlug ? { plan: planSlug } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);
    console.log('[WEBHOOK_STRIPE] Organization update:', { organizationId, planSlug, error: orgError });

    // Calculate affiliate commission if org was referred
    await calculateAffiliateCommission(supabase, organizationId, session);
  }
}

async function resolvePlanSlug(
  supabase: SupabaseAdmin,
  planId: string | null
): Promise<string | null> {
  if (!planId) return null;
  const { data } = await supabase
    .from('billing_plans')
    .select('slug')
    .eq('id', planId)
    .maybeSingle();
  return (data as { slug: string } | null)?.slug ?? null;
}

function extractSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails) return null;
  return typeof subDetails.subscription === 'string'
    ? subDetails.subscription
    : subDetails.subscription?.id ?? null;
}

async function handleInvoicePaid(
  supabase: SupabaseAdmin,
  invoice: Stripe.Invoice
): Promise<void> {
  const stripeSubscriptionId = extractSubscriptionIdFromInvoice(invoice);
  if (!stripeSubscriptionId) return;

  await supabase
    .from('billing_subscriptions')
    .update({
      status: 'active',
      current_period_start: invoice.lines.data[0]?.period?.start
        ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
        : undefined,
      current_period_end: invoice.lines.data[0]?.period?.end
        ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
        : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId);
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseAdmin,
  invoice: Stripe.Invoice
): Promise<void> {
  const stripeSubscriptionId = extractSubscriptionIdFromInvoice(invoice);
  if (!stripeSubscriptionId) return;

  await supabase
    .from('billing_subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId);
}

async function handleSubscriptionUpdated(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription
): Promise<void> {
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
    unpaid: 'past_due',
    incomplete: 'pending',
    incomplete_expired: 'canceled',
    paused: 'canceled',
  };
  const mappedStatus = statusMap[subscription.status] ?? subscription.status;

  const latestInvoice = subscription.latest_invoice;
  const latestInvoiceObj = typeof latestInvoice === 'object' && latestInvoice !== null
    ? latestInvoice as Stripe.Invoice
    : null;
  const periodStart = latestInvoiceObj?.lines?.data[0]?.period?.start;
  const periodEnd = latestInvoiceObj?.lines?.data[0]?.period?.end;

  await supabase
    .from('billing_subscriptions')
    .update({
      status: mappedStatus,
      ...(periodStart ? { current_period_start: new Date(periodStart * 1000).toISOString() } : {}),
      ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription
): Promise<void> {
  await supabase
    .from('billing_subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  const organizationId = subscription.metadata?.organization_id;
  if (organizationId) {
    await supabase
      .from('organizations')
      .update({
        stripe_subscription_id: null,
        plan: 'FREE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);
  }
}

async function calculateAffiliateCommission(
  supabase: SupabaseAdmin,
  organizationId: string,
  session: Stripe.Checkout.Session
): Promise<void> {
  try {
    // Check if this org was referred by an affiliate
    const { data: org } = await supabase
      .from('organizations')
      .select('referred_by')
      .eq('id', organizationId)
      .maybeSingle();

    if (!org?.referred_by) return;

    const affiliateId = org.referred_by;

    // Get affiliate info
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, commission_percent, status')
      .eq('id', affiliateId)
      .eq('status', 'active')
      .maybeSingle();

    if (!affiliate) return;

    // Get the referral record
    const { data: referral } = await supabase
      .from('affiliate_referrals')
      .select('id')
      .eq('affiliate_id', affiliateId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!referral) return;

    // Calculate commission from payment amount
    const amountPaid = session.amount_total || 0; // in cents
    const commissionCents = Math.round(amountPaid * (Number(affiliate.commission_percent) / 100));

    if (commissionCents <= 0) return;

    const sourceType = session.metadata?.type === 'extra_hours' ? 'extra_hours' : 'subscription';
    const sourceId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;

    // Check for duplicate commission (same source_id)
    const { data: existingCommission } = await supabase
      .from('affiliate_commissions')
      .select('id')
      .eq('source_id', sourceId)
      .maybeSingle();

    if (existingCommission) return; // Already processed

    // Insert commission (available after 30 days)
    const availableAt = new Date();
    availableAt.setDate(availableAt.getDate() + 30);

    await supabase.from('affiliate_commissions').insert({
      affiliate_id: affiliateId,
      referral_id: referral.id,
      amount_cents: commissionCents,
      source_type: sourceType,
      source_id: sourceId,
      status: 'pending',
      available_at: availableAt.toISOString(),
    });

    // Update referral status to active
    await supabase
      .from('affiliate_referrals')
      .update({ status: 'active' })
      .eq('id', referral.id);

    console.log('[WEBHOOK_STRIPE] Affiliate commission created:', {
      affiliateId,
      organizationId,
      commissionCents,
      commissionPercent: affiliate.commission_percent,
      sourceType,
    });
  } catch (err) {
    console.error('[WEBHOOK_STRIPE] Failed to calculate affiliate commission:', err);
  }
}

async function handleExtraHoursPurchase(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session
): Promise<void> {
  const purchaseId = session.metadata?.purchase_id;
  if (!purchaseId) {
    console.error('[WEBHOOK_STRIPE] Extra hours purchase missing purchase_id in metadata');
    return;
  }

  const stripePaymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  const { error } = await supabase
    .from('extra_hours_purchases')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: stripePaymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .in('status', ['pending']);

  if (error) {
    console.error('[WEBHOOK_STRIPE] Failed to update extra hours purchase:', error);
  } else {
    console.log('[WEBHOOK_STRIPE] Extra hours purchase confirmed:', {
      purchaseId,
      hours: session.metadata?.hours,
      plan: session.metadata?.plan,
    });

    // Calculate affiliate commission for extra hours too
    const orgId = session.metadata?.organization_id;
    if (orgId) {
      await calculateAffiliateCommission(supabase, orgId, session);
    }
  }
}
