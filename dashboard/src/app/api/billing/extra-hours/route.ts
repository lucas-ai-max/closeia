import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCheckoutSession } from '@/lib/stripe'
import { z } from 'zod'

// Extra hour prices per plan (in centavos)
const EXTRA_HOUR_PRICES: Record<string, number> = {
  STARTER: 1000, // R$10/hora
  PRO: 900,      // R$9/hora
  TEAM: 800,     // R$8/hora
}

const MIN_HOURS = 5

const BodySchema = z.object({
  hours: z.number().int().min(MIN_HOURS, `Mínimo de ${MIN_HOURS} horas`),
})

/**
 * POST /api/billing/extra-hours
 * Creates a Stripe Checkout Session for extra hours purchase.
 * Price is based on the organization's current plan.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, email')
      .eq('id', user.id)
      .single()

    const organizationId = (profile as { organization_id: string | null } | null)?.organization_id
    if (!organizationId) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 403 })
    }

    // Get org plan
    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', organizationId)
      .single()

    const plan = ((org as { plan?: string } | null)?.plan ?? 'FREE').toUpperCase()
    const pricePerHour = EXTRA_HOUR_PRICES[plan]
    if (!pricePerHour) {
      return NextResponse.json(
        { error: 'Plano não suporta compra de horas extras' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { hours } = parsed.data
    const totalCents = pricePerHour * hours
    const customerEmail = (profile as { email: string | null })?.email ?? user.email ?? ''
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Create purchase record (pending) — admin client bypasses RLS
    const adminDb = createAdminClient()
    const { data: purchase, error: insertError } = await adminDb
      .from('extra_hours_purchases')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        hours,
        amount_cents: totalCents,
        currency: 'brl',
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError || !purchase) {
      console.error('[EXTRA_HOURS] Insert failed:', insertError)
      return NextResponse.json({ error: 'Falha ao criar compra' }, { status: 500 })
    }

    // Create Stripe Checkout Session
    const sessionResult = await createCheckoutSession({
      mode: 'payment',
      customerEmail,
      lineItems: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: `${hours} Horas Extras - HelpSeller`,
            description: `Pacote de ${hours} horas extras de coaching (${plan})`,
          },
          unit_amount: pricePerHour,
        },
        quantity: hours,
      }],
      successUrl: `${origin}/billing?extra_hours=success`,
      cancelUrl: `${origin}/billing?extra_hours=cancel`,
      metadata: {
        type: 'extra_hours',
        organization_id: organizationId,
        user_id: user.id,
        purchase_id: purchase.id,
        hours: String(hours),
        plan,
      },
    })

    // Update purchase with stripe session ID
    await adminDb
      .from('extra_hours_purchases')
      .update({ stripe_session_id: sessionResult.sessionId })
      .eq('id', purchase.id)

    return NextResponse.json({
      checkoutUrl: sessionResult.checkoutUrl,
      purchaseId: purchase.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[EXTRA_HOURS] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
