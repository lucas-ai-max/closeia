import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.js';
import { supabaseAdmin } from '../../../infrastructure/supabase/client.js';

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

        // POST /api/calls/:id/outcome
        protectedRoutes.post('/calls/:id/outcome', async (request: any, reply) => {
            const { id } = request.params as { id: string };
            const { outcome } = request.body as { outcome: 'CONVERTED' | 'LOST' | 'FOLLOW_UP' };
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

            // Enrich with success rates
            const enriched = await Promise.all(objections!.map(async (obj: any) => {
                const { data: metrics } = await supabaseAdmin
                    .from('objection_success_metrics')
                    .select('success_count, total_usage')
                    .eq('objection_id', obj.id)
                    .eq('script_id', scriptId)
                    .maybeSingle();

                const success_rate = metrics && metrics.total_usage > 0
                    ? metrics.success_count / metrics.total_usage
                    : 0;

                return { ...obj, success_rate };
            }));

            return enriched;
        });

    });

    // Public/Webhooks
    fastify.post('/webhooks/stripe', async (request, reply) => {
        // Stripe logic here
        return { received: true };
    });

}
