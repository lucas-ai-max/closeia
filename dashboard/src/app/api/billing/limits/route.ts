import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getPlanLimits, type PlanSlug, type FeatureKey } from '@/lib/plan-limits';

export interface OrganizationUsage {
  plan: PlanSlug;
  limits: {
    maxSellers: number;
    maxCallHoursPerMonth: number;
    extraHourCents: number;
  };
  usage: {
    currentSellers: number;
    currentCallHoursThisMonth: number;
  };
  remaining: {
    sellerSlots: number;
    callHours: number;
  };
  features: Record<FeatureKey, boolean>;
  canStartCall: boolean;
  canAddSeller: boolean;
}

/**
 * GET /api/billing/limits
 * Returns the current organization's plan limits and usage.
 * Requires authenticated user with organization_id.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const organizationId = (profile as { organization_id: string | null } | null)?.organization_id;

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    // Get organization plan
    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', organizationId)
      .single();

    const plan = ((org as { plan?: string } | null)?.plan ?? 'FREE') as PlanSlug;
    const planLimits = getPlanLimits(plan);

    // Count active sellers in the organization
    const { count: sellerCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('role', 'SELLER')
      .eq('is_active', true);

    const currentSellers = sellerCount ?? 0;

    // Calculate call hours this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: callsData } = await supabase
      .from('calls')
      .select('duration_seconds')
      .eq('organization_id', organizationId)
      .gte('started_at', startOfMonth.toISOString())
      .lt('started_at', endOfMonth.toISOString());

    const totalSeconds = (callsData ?? []).reduce((sum, call) => {
      const duration = (call as { duration_seconds: number | null }).duration_seconds ?? 0;
      return sum + duration;
    }, 0);

    const currentCallHours = Math.round((totalSeconds / 3600) * 100) / 100;

    // Calculate remaining
    const remainingSellerSlots =
      planLimits.maxSellers === -1 ? Infinity : Math.max(0, planLimits.maxSellers - currentSellers);

    const remainingCallHours =
      planLimits.maxCallHoursPerMonth === -1
        ? Infinity
        : Math.max(0, planLimits.maxCallHoursPerMonth - currentCallHours);

    // Check permissions
    const canStartCall = planLimits.maxCallHoursPerMonth === -1 || currentCallHours < planLimits.maxCallHoursPerMonth;
    const canAddSeller = planLimits.maxSellers === -1 || currentSellers < planLimits.maxSellers;

    const response: OrganizationUsage = {
      plan,
      limits: {
        maxSellers: planLimits.maxSellers,
        maxCallHoursPerMonth: planLimits.maxCallHoursPerMonth,
        extraHourCents: planLimits.extraHourCents,
      },
      usage: {
        currentSellers,
        currentCallHoursThisMonth: currentCallHours,
      },
      remaining: {
        sellerSlots: remainingSellerSlots === Infinity ? -1 : remainingSellerSlots,
        callHours: remainingCallHours === Infinity ? -1 : remainingCallHours,
      },
      features: planLimits.features,
      canStartCall,
      canAddSeller,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[BILLING_LIMITS] Error:', err);
    return NextResponse.json({ error: 'Failed to get limits' }, { status: 500 });
  }
}
