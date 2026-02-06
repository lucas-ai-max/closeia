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

    });

    // Public/Webhooks
    fastify.post('/webhooks/stripe', async (request, reply) => {
        // Stripe logic here
        return { received: true };
    });

}
