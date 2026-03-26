/**
 * Plan limits and feature verification for backend.
 * Used to enforce limits on WebSocket calls and API endpoints.
 */

import { supabaseAdmin } from '../supabase/client.js';
import { logger } from '../../shared/utils/logger.js';

export type PlanSlug = 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE';

export type FeatureKey =
  | 'coaching_ai'
  | 'objection_detection'
  | 'spin_indicator'
  | 'call_history'
  | 'post_call_summary'
  | 'basic_dashboard'
  | 'advanced_analytics'
  | 'seller_ranking'
  | 'manager_dashboard'
  | 'reprocess_analysis'
  | 'live_command_center'
  | 'manager_whisper'
  | 'advanced_kpis'
  | 'team_management'
  | 'custom_integrations'
  | 'priority_support'
  | 'dedicated_sla';

export interface PlanLimits {
  maxSellers: number; // -1 = unlimited
  maxCallHoursPerMonth: number; // -1 = unlimited
  extraHourCents: number;
  features: Record<FeatureKey, boolean>;
}

const PLAN_LIMITS: Record<PlanSlug, PlanLimits> = {
  FREE: {
    maxSellers: 0,
    maxCallHoursPerMonth: 0,
    extraHourCents: 0,
    features: {
      coaching_ai: false,
      objection_detection: false,
      spin_indicator: false,
      call_history: false,
      post_call_summary: false,
      basic_dashboard: false,
      advanced_analytics: false,
      seller_ranking: false,
      manager_dashboard: false,
      reprocess_analysis: false,
      live_command_center: false,
      manager_whisper: false,
      advanced_kpis: false,
      team_management: false,
      custom_integrations: false,
      priority_support: false,
      dedicated_sla: false,
    },
  },
  STARTER: {
    maxSellers: 2,
    maxCallHoursPerMonth: 15,
    extraHourCents: 1000, // R$ 10/hora
    features: {
      coaching_ai: true,
      objection_detection: true,
      spin_indicator: true,
      call_history: true,
      post_call_summary: true,
      basic_dashboard: true,
      advanced_analytics: false,
      seller_ranking: false,
      manager_dashboard: false,
      reprocess_analysis: false,
      live_command_center: false,
      manager_whisper: false,
      advanced_kpis: false,
      team_management: false,
      custom_integrations: false,
      priority_support: false,
      dedicated_sla: false,
    },
  },
  PRO: {
    maxSellers: 5,
    maxCallHoursPerMonth: 60,
    extraHourCents: 900, // R$ 9/hora
    features: {
      coaching_ai: true,
      objection_detection: true,
      spin_indicator: true,
      call_history: true,
      post_call_summary: true,
      basic_dashboard: true,
      advanced_analytics: true,
      seller_ranking: true,
      manager_dashboard: true,
      reprocess_analysis: true,
      live_command_center: false,
      manager_whisper: false,
      advanced_kpis: false,
      team_management: false,
      custom_integrations: false,
      priority_support: false,
      dedicated_sla: false,
    },
  },
  TEAM: {
    maxSellers: 10,
    maxCallHoursPerMonth: 150,
    extraHourCents: 800, // R$ 8/hora
    features: {
      coaching_ai: true,
      objection_detection: true,
      spin_indicator: true,
      call_history: true,
      post_call_summary: true,
      basic_dashboard: true,
      advanced_analytics: true,
      seller_ranking: true,
      manager_dashboard: true,
      reprocess_analysis: true,
      live_command_center: true,
      manager_whisper: true,
      advanced_kpis: true,
      team_management: true,
      custom_integrations: false,
      priority_support: false,
      dedicated_sla: false,
    },
  },
  ENTERPRISE: {
    maxSellers: -1, // unlimited — customized per contract
    maxCallHoursPerMonth: -1, // unlimited — customized per contract
    extraHourCents: 0, // customized per contract
    features: {
      coaching_ai: true,
      objection_detection: true,
      spin_indicator: true,
      call_history: true,
      post_call_summary: true,
      basic_dashboard: true,
      advanced_analytics: true,
      seller_ranking: true,
      manager_dashboard: true,
      reprocess_analysis: true,
      live_command_center: true,
      manager_whisper: true,
      advanced_kpis: true,
      team_management: true,
      custom_integrations: true,
      priority_support: true,
      dedicated_sla: true,
    },
  },
};

/**
 * Get limits for a plan
 */
export function getPlanLimits(plan: string): PlanLimits {
  const normalizedPlan = (plan?.toUpperCase() ?? 'FREE') as PlanSlug;
  return PLAN_LIMITS[normalizedPlan] ?? PLAN_LIMITS.FREE;
}

/**
 * Check if a plan has access to a specific feature
 */
export function hasFeature(plan: string, feature: FeatureKey): boolean {
  const limits = getPlanLimits(plan);
  return limits.features[feature] ?? false;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: 'LIMIT_REACHED' | 'NO_PLAN' | 'FEATURE_DISABLED';
  plan: PlanSlug;
  currentUsage: number;
  maxAllowed: number;
  remainingHours: number;
}

/**
 * Check if organization can start a new call based on hours limit.
 * @param organizationId The organization UUID
 * @returns UsageCheckResult with allowed status and details
 */
export async function checkCallHoursLimit(organizationId: string | null): Promise<UsageCheckResult> {
  const defaultResult: UsageCheckResult = {
    allowed: false,
    reason: 'NO_PLAN',
    plan: 'FREE',
    currentUsage: 0,
    maxAllowed: 0,
    remainingHours: 0,
  };

  if (!organizationId) {
    logger.warn({ organizationId }, '[PLAN_LIMITS] No organization ID provided');
    return defaultResult;
  }

  try {
    // Get organization plan
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('plan')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      logger.warn({ organizationId, error: orgError }, '[PLAN_LIMITS] Failed to fetch organization');
      return defaultResult;
    }

    const plan = (org.plan?.toUpperCase() ?? 'FREE') as PlanSlug;
    const limits = getPlanLimits(plan);

    // FREE plan cannot start calls
    if (plan === 'FREE') {
      return {
        allowed: false,
        reason: 'NO_PLAN',
        plan,
        currentUsage: 0,
        maxAllowed: 0,
        remainingHours: 0,
      };
    }

    // Unlimited plans (ENTERPRISE or -1)
    if (limits.maxCallHoursPerMonth === -1) {
      return {
        allowed: true,
        plan,
        currentUsage: 0,
        maxAllowed: -1,
        remainingHours: -1,
      };
    }

    // Calculate current month usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: calls, error: callsError } = await supabaseAdmin
      .from('calls')
      .select('duration_seconds')
      .eq('organization_id', organizationId)
      .gte('started_at', startOfMonth.toISOString())
      .lt('started_at', endOfMonth.toISOString());

    if (callsError) {
      logger.error({ organizationId, error: callsError }, '[PLAN_LIMITS] Failed to fetch calls usage — denying call');
      return {
        allowed: false,
        reason: 'NO_PLAN',
        plan,
        currentUsage: 0,
        maxAllowed: limits.maxCallHoursPerMonth,
        remainingHours: 0,
      };
    }

    const totalSeconds = (calls ?? []).reduce((sum, call) => {
      return sum + (call.duration_seconds ?? 0);
    }, 0);

    const currentHours = totalSeconds / 3600;

    // Check for extra hours purchased this month
    let extraHours = 0;
    try {
      const { data: purchases } = await supabaseAdmin
        .from('extra_hours_purchases')
        .select('hours')
        .eq('organization_id', organizationId)
        .eq('status', 'paid')
        .eq('valid_month', startOfMonth.toISOString().split('T')[0]);

      if (purchases) {
        extraHours = purchases.reduce((sum, p) => sum + (p.hours ?? 0), 0);
      }
    } catch {
      // If table doesn't exist yet, ignore
    }

    const totalAllowed = limits.maxCallHoursPerMonth + extraHours;
    const remainingHours = Math.max(0, totalAllowed - currentHours);

    if (currentHours >= totalAllowed) {
      logger.info({
        organizationId,
        plan,
        currentHours: currentHours.toFixed(2),
        maxHours: limits.maxCallHoursPerMonth,
      }, '[PLAN_LIMITS] Call hours limit reached');

      return {
        allowed: false,
        reason: 'LIMIT_REACHED',
        plan,
        currentUsage: Math.round(currentHours * 100) / 100,
        maxAllowed: totalAllowed,
        remainingHours: 0,
      };
    }

    return {
      allowed: true,
      plan,
      currentUsage: Math.round(currentHours * 100) / 100,
      maxAllowed: totalAllowed,
      remainingHours: Math.round(remainingHours * 100) / 100,
    };
  } catch (err) {
    logger.error({ err, organizationId }, '[PLAN_LIMITS] Error checking call hours limit — denying call');
    return {
      allowed: false,
      reason: 'NO_PLAN',
      plan: 'FREE',
      currentUsage: 0,
      maxAllowed: 0,
      remainingHours: 0,
    };
  }
}

/**
 * Check if organization can add a new seller based on limit.
 * @param organizationId The organization UUID
 * @returns Object with allowed status and details
 */
export async function checkSellerLimit(organizationId: string | null): Promise<{
  allowed: boolean;
  reason?: 'LIMIT_REACHED' | 'NO_PLAN';
  plan: PlanSlug;
  currentSellers: number;
  maxSellers: number;
}> {
  const defaultResult = {
    allowed: false,
    reason: 'NO_PLAN' as const,
    plan: 'FREE' as PlanSlug,
    currentSellers: 0,
    maxSellers: 0,
  };

  if (!organizationId) {
    return defaultResult;
  }

  try {
    // Get organization plan
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('plan')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return defaultResult;
    }

    const plan = (org.plan?.toUpperCase() ?? 'FREE') as PlanSlug;
    const limits = getPlanLimits(plan);

    // Unlimited
    if (limits.maxSellers === -1) {
      return {
        allowed: true,
        plan,
        currentSellers: 0,
        maxSellers: -1,
      };
    }

    // Count current sellers
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('role', 'SELLER')
      .eq('is_active', true);

    if (countError) {
      logger.error({ organizationId, error: countError }, '[PLAN_LIMITS] Failed to count sellers — denying');
      return {
        allowed: false,
        reason: 'NO_PLAN',
        plan,
        currentSellers: 0,
        maxSellers: limits.maxSellers,
      };
    }

    const currentSellers = count ?? 0;

    if (currentSellers >= limits.maxSellers) {
      return {
        allowed: false,
        reason: 'LIMIT_REACHED',
        plan,
        currentSellers,
        maxSellers: limits.maxSellers,
      };
    }

    return {
      allowed: true,
      plan,
      currentSellers,
      maxSellers: limits.maxSellers,
    };
  } catch (err) {
    logger.error({ err, organizationId }, '[PLAN_LIMITS] Error checking seller limit — denying');
    return {
      allowed: false,
      reason: 'NO_PLAN',
      plan: 'FREE',
      currentSellers: 0,
      maxSellers: 0,
    };
  }
}

/**
 * Check if organization has access to manager whisper feature.
 */
export async function canUseManagerWhisper(organizationId: string | null): Promise<boolean> {
  if (!organizationId) return false;

  try {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('plan')
      .eq('id', organizationId)
      .single();

    if (!org) return false;

    return hasFeature(org.plan ?? 'FREE', 'manager_whisper');
  } catch {
    return false;
  }
}

/**
 * Check if organization has access to live command center.
 */
export async function canUseLiveCommandCenter(organizationId: string | null): Promise<boolean> {
  if (!organizationId) return false;

  try {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('plan')
      .eq('id', organizationId)
      .single();

    if (!org) return false;

    return hasFeature(org.plan ?? 'FREE', 'live_command_center');
  } catch {
    return false;
  }
}
