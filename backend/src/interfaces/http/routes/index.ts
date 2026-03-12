import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth.js';
import { planGuard } from '../middlewares/plan-guard.js';
import { supabaseAdmin } from '../../../infrastructure/supabase/client.js';
import { adminRoutes } from './admin.js';
import { coachRoutes } from './coaches.js';

const OutcomeSchema = z.object({
    outcome: z.enum(['CONVERTED', 'LOST', 'FOLLOW_UP']),
});

export async function routes(fastify: FastifyInstance) {

    // Health Check
    fastify.get('/health', async () => {
        return { status: 'ok' };
    });

    // Protected Routes Group
    fastify.register(async (protectedRoutes) => {
        protectedRoutes.addHook('preHandler', authMiddleware);

        // ANALYTICS ROUTES
        // GET /api/analytics/overview
        protectedRoutes.get('/analytics/overview', async (request: any, reply) => {
            const { organization_id } = request.user;

            // Call Supabase RPC function (assumed created via migration)
            const { data, error } = await supabaseAdmin.rpc('get_org_analytics', {
                org_id: organization_id,
                period_days: 30
            });

            if (error) throw error;
            return data;
        });

        // CALL ROUTES
        // POST /api/calls/:id/end
        protectedRoutes.post('/calls/:id/end', async (request: any, reply) => {
            const { id } = request.params as { id: string };
            // Logic to trigger AI summary would go here
            return { message: 'Call ended processing started' };
        });

        // POST /api/calls/:id/reprocess-summary — reprocessa análise da chamada (para chamadas COMPLETED sem resumo)
        protectedRoutes.post('/calls/:id/reprocess-summary', { preHandler: planGuard('reprocess_analysis') }, async (request: any, reply) => {
            const { id: callId } = request.params as { id: string };
            const { organization_id } = request.user;

            const { data: call } = await supabaseAdmin
                .from('calls')
                .select('organization_id')
                .eq('id', callId)
                .single();

            if (!call || (call as any).organization_id !== organization_id) {
                return reply.code(404).send({ error: 'Chamada não encontrada' });
            }

            const { reprocessCallSummary } = await import('../../../application/reprocess-call-summary.js');
            const result = await reprocessCallSummary(callId);

            if (!result.ok) {
                return reply.code(400).send({ error: result.error ?? 'Falha ao reprocessar' });
            }
            return { success: true };
        });

        // POST /api/calls/:id/outcome
        protectedRoutes.post('/calls/:id/outcome', async (request: any, reply) => {
            const { id } = request.params as { id: string };
            const parsed = OutcomeSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.code(400).send({ error: 'Dados inválidos', details: parsed.error.flatten() });
            }
            const { outcome } = parsed.data;
            const { organization_id } = request.user;

            // 1. Update Call Summary
            const { data: summary, error } = await supabaseAdmin
                .from('call_summaries')
                .update({ result: outcome })
                .eq('call_id', id)
                .select()
                .single();

            if (error) return reply.code(500).send({ error: 'Failed to update outcome' });

            // 2. Trigger Learning Loop
            // Fetch necessary data to track objection success
            const { data: call } = await supabaseAdmin
                .from('calls')
                .select('script_id')
                .eq('id', id)
                .single();

            if (call && call.script_id) {
                // We need to know which objections were faced. 
                // Assuming 'objections_faced' is stored in call_summaries as JSON array of objection IDs or strings
                // For this implementation, we'll try to use what's in summary.objections_faced
                // If it stores IDs, we are good.

                const objectionIds = summary.objections_faced || [];
                // Ensure they are strings
                if (Array.isArray(objectionIds) && objectionIds.length > 0) {
                    // Instantiate tracker logic (could be separate service, but reusing logic here or importing the service)
                    // Ideally we import the singleton 'successTracker' but it's in websocket/server.ts
                    // Let's create a new instance for HTTP context or move instantiation to a shared container
                    // For now: NEW instance
                    const { ObjectionSuccessTracker } = await import('../../../infrastructure/ai/objection-success-tracker.js');
                    const tracker = new ObjectionSuccessTracker(supabaseAdmin);

                    await tracker.trackCallResult(
                        call.script_id,
                        objectionIds,
                        outcome === 'CONVERTED'
                    );
                }
            }

            return { success: true };
        });

        // SCRIPT ROUTES
        // GET /api/scripts/:id/objections - Fetch objections with success rates for edge caching
        protectedRoutes.get('/scripts/:id/objections', async (request: any, reply) => {
            const { id: scriptId } = request.params as { id: string };
            const { organization_id } = request.user;

            // Verify script belongs to user's organization
            const { data: script } = await supabaseAdmin
                .from('scripts')
                .select('id, organization_id')
                .eq('id', scriptId)
                .eq('organization_id', organization_id)
                .maybeSingle();

            if (!script) {
                return reply.code(404).send({ error: 'Script not found' });
            }

            // Fetch objections for the script
            const { data: objections, error } = await supabaseAdmin
                .from('objections')
                .select('id, trigger_phrases, suggested_response, mental_trigger, coaching_tip')
                .eq('script_id', scriptId);

            if (error) throw error;

            // Enrich with success rates (batch query instead of N+1)
            const objectionIds = (objections ?? []).map((obj: any) => obj.id);
            const { data: allMetrics } = objectionIds.length > 0
                ? await supabaseAdmin
                    .from('objection_success_metrics')
                    .select('objection_id, success_count, total_usage')
                    .in('objection_id', objectionIds)
                    .eq('script_id', scriptId)
                : { data: [] };

            const metricsMap = new Map(
                (allMetrics ?? []).map((m: any) => [m.objection_id, m])
            );

            const enriched = (objections ?? []).map((obj: any) => {
                const metrics = metricsMap.get(obj.id);
                const success_rate = metrics && metrics.total_usage > 0
                    ? metrics.success_count / metrics.total_usage
                    : 0;
                return { ...obj, success_rate };
            });

            return enriched;
        });

        // COACH ROUTES
        protectedRoutes.register(coachRoutes, { prefix: '/coaches' });

        // ADMIN ROUTES
        protectedRoutes.register(adminRoutes, { prefix: '/admin' });

    });

    // Public/Webhooks (billing is handled by Next.js dashboard API routes)

}
