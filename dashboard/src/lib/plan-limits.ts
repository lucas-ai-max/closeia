/**
 * Plan limits and feature definitions.
 * Centralized configuration for plan-based access control.
 */

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

export const PLAN_LIMITS: Record<PlanSlug, PlanLimits> = {
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
    extraHourCents: 800, // R$ 8/hora
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
    extraHourCents: 700, // R$ 7/hora
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
    extraHourCents: 600, // R$ 6/hora
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
    maxSellers: 50,
    maxCallHoursPerMonth: 400,
    extraHourCents: 500, // R$ 5/hora
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

/**
 * Check if a plan can add more sellers
 */
export function canAddSeller(plan: string, currentSellers: number): boolean {
  const limits = getPlanLimits(plan);
  if (limits.maxSellers === -1) return true; // unlimited
  return currentSellers < limits.maxSellers;
}

/**
 * Check if a plan can start a new call (based on hours used)
 */
export function canStartCall(plan: string, usedHours: number): boolean {
  const limits = getPlanLimits(plan);
  if (limits.maxCallHoursPerMonth === -1) return true; // unlimited
  return usedHours < limits.maxCallHoursPerMonth;
}

/**
 * Get remaining call hours for a plan
 */
export function getRemainingHours(plan: string, usedHours: number): number {
  const limits = getPlanLimits(plan);
  if (limits.maxCallHoursPerMonth === -1) return Infinity;
  return Math.max(0, limits.maxCallHoursPerMonth - usedHours);
}

/**
 * Get remaining seller slots for a plan
 */
export function getRemainingSellerSlots(plan: string, currentSellers: number): number {
  const limits = getPlanLimits(plan);
  if (limits.maxSellers === -1) return Infinity;
  return Math.max(0, limits.maxSellers - currentSellers);
}

/**
 * Route to feature mapping for access control
 * Note: /team is accessible to all paid plans - the seller limit is enforced when adding users
 */
export const ROUTE_FEATURE_MAP: Record<string, FeatureKey | null> = {
  '/dashboard': 'basic_dashboard',
  '/calls': 'call_history',
  '/analytics': 'advanced_analytics',
  '/team': null, // accessible to all paid plans - seller limit enforced on add
  '/live': 'live_command_center',
  '/settings': null, // always accessible
  '/billing': null, // always accessible
};

/**
 * Get required feature for a route
 */
export function getRequiredFeature(pathname: string): FeatureKey | null {
  // Exact match first
  if (pathname in ROUTE_FEATURE_MAP) {
    return ROUTE_FEATURE_MAP[pathname];
  }

  // Check prefix matches
  for (const [route, feature] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (pathname.startsWith(route + '/')) {
      return feature;
    }
  }

  return null;
}

/**
 * Get minimum plan required for a feature
 */
export function getMinimumPlanForFeature(feature: FeatureKey): PlanSlug {
  const planOrder: PlanSlug[] = ['FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE'];

  for (const plan of planOrder) {
    if (PLAN_LIMITS[plan].features[feature]) {
      return plan;
    }
  }

  return 'ENTERPRISE';
}

/**
 * Feature display names for UI
 */
export const FEATURE_NAMES: Record<FeatureKey, string> = {
  coaching_ai: 'Coaching IA em tempo real',
  objection_detection: 'Detecção de objeções',
  spin_indicator: 'Indicador SPIN',
  call_history: 'Histórico de chamadas',
  post_call_summary: 'Resumo pós-call',
  basic_dashboard: 'Dashboard básico',
  advanced_analytics: 'Analytics avançado',
  seller_ranking: 'Ranking de vendedores',
  manager_dashboard: 'Dashboard manager',
  reprocess_analysis: 'Reprocessamento de análise',
  live_command_center: 'Torre de comando ao vivo',
  manager_whisper: 'Manager Whisper',
  advanced_kpis: 'KPIs avançados',
  team_management: 'Gestão avançada de equipe',
  custom_integrations: 'Integrações personalizadas',
  priority_support: 'Suporte prioritário',
  dedicated_sla: 'SLA dedicado',
};
