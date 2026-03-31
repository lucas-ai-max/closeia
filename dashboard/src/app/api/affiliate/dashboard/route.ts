import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/affiliate/dashboard
 * Returns affiliate dashboard metrics for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminDb = createAdminClient()

    // Find affiliate record for this user
    const { data: affiliate, error: affError } = await adminDb
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (affError || !affiliate) {
      return NextResponse.json(
        { error: 'Registro de afiliado não encontrado' },
        { status: 404 }
      )
    }

    // Count total referrals
    const { count: totalReferrals } = await adminDb
      .from('affiliate_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id)

    // Count active subscriptions among referrals
    const { count: activeSubscriptions } = await adminDb
      .from('affiliate_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'active')

    // Sum available balance (commissions with status='available')
    const { data: availableRows } = await adminDb
      .from('affiliate_commissions')
      .select('amount_cents')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'available')

    const availableBalanceCents = (availableRows ?? []).reduce(
      (sum: number, r: { amount_cents: number }) => sum + r.amount_cents,
      0
    )

    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://helpcloser.app'

    return NextResponse.json({
      affiliate_id: affiliate.id,
      code: affiliate.code,
      status: affiliate.status,
      link: `${origin}/?ref=${affiliate.code}`,
      total_referrals: totalReferrals ?? 0,
      active_subscriptions: activeSubscriptions ?? 0,
      total_earned_cents: affiliate.total_earned_cents ?? 0,
      available_balance_cents: availableBalanceCents,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AFFILIATE_DASHBOARD] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
