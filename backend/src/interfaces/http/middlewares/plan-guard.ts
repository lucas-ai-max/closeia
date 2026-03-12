import { FastifyReply, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../../../infrastructure/supabase/client.js';
import { FeatureKey, PlanSlug } from '../../../infrastructure/billing/plan-limits.js';
import { logger } from '../../../shared/utils/logger.js';

// Import the PLAN_LIMITS from plan-limits (we need hasFeature logic)
const PLAN_FEATURES: Record<string, Record<FeatureKey, boolean>> = {
    FREE: { coaching_ai: false, objection_detection: false, spin_indicator: false, call_history: false, post_call_summary: false, basic_dashboard: false, advanced_analytics: false, seller_ranking: false, manager_dashboard: false, reprocess_analysis: false, live_command_center: false, manager_whisper: false, advanced_kpis: false, team_management: false, custom_integrations: false, priority_support: false, dedicated_sla: false },
    STARTER: { coaching_ai: true, objection_detection: true, spin_indicator: true, call_history: true, post_call_summary: true, basic_dashboard: true, advanced_analytics: false, seller_ranking: false, manager_dashboard: false, reprocess_analysis: false, live_command_center: false, manager_whisper: false, advanced_kpis: false, team_management: false, custom_integrations: false, priority_support: false, dedicated_sla: false },
    PRO: { coaching_ai: true, objection_detection: true, spin_indicator: true, call_history: true, post_call_summary: true, basic_dashboard: true, advanced_analytics: true, seller_ranking: true, manager_dashboard: true, reprocess_analysis: true, live_command_center: false, manager_whisper: false, advanced_kpis: false, team_management: false, custom_integrations: false, priority_support: false, dedicated_sla: false },
    TEAM: { coaching_ai: true, objection_detection: true, spin_indicator: true, call_history: true, post_call_summary: true, basic_dashboard: true, advanced_analytics: true, seller_ranking: true, manager_dashboard: true, reprocess_analysis: true, live_command_center: true, manager_whisper: true, advanced_kpis: true, team_management: true, custom_integrations: false, priority_support: true, dedicated_sla: false },
    ENTERPRISE: { coaching_ai: true, objection_detection: true, spin_indicator: true, call_history: true, post_call_summary: true, basic_dashboard: true, advanced_analytics: true, seller_ranking: true, manager_dashboard: true, reprocess_analysis: true, live_command_center: true, manager_whisper: true, advanced_kpis: true, team_management: true, custom_integrations: true, priority_support: true, dedicated_sla: true },
};

function hasFeature(plan: string, feature: FeatureKey): boolean {
    const features = PLAN_FEATURES[plan];
    if (!features) return false;
    return features[feature] ?? false;
}

/**
 * Creates a Fastify preHandler that checks if the user's organization plan
 * has a required feature. Must be used AFTER authMiddleware (needs request.user).
 */
export function planGuard(requiredFeature: FeatureKey) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;
        if (!user?.organization_id) {
            return reply.code(403).send({ error: 'No organization found', requiredFeature });
        }

        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('plan')
            .eq('id', user.organization_id)
            .single();

        const plan = (org as { plan?: string } | null)?.plan ?? 'FREE';

        if (!hasFeature(plan, requiredFeature)) {
            logger.warn({ userId: user.id, plan, requiredFeature }, 'Plan guard: feature not available');
            return reply.code(403).send({
                error: 'Plan upgrade required',
                requiredFeature,
                currentPlan: plan,
            });
        }
    };
}
