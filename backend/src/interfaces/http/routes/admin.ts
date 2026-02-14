import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../../../infrastructure/supabase/client.js';

export async function adminRoutes(fastify: FastifyInstance) {
    fastify.post('/create-user', async (request: any, reply) => {
        const { email, password, name } = request.body;
        const { organization_id, role } = request.user;

        // Security check: Only managers can create users
        if (role !== 'MANAGER') {
            return reply.code(403).send({ error: 'Unauthorized: Only managers can create users' });
        }

        if (!email || !password || !name) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }

        try {
            // 1. Create User in Supabase Auth
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm for simplicity in this flow
                user_metadata: {
                    full_name: name,
                    role: 'SELLER', // Enforce role
                    organization_id: organization_id // Enforce same org
                }
            });

            if (authError) throw authError;

            // 2. Create Profile in public.profiles (if not handled by trigger)
            // Ideally, a Supabase trigger handles this, but we can double check or enforce additional data here if needed.
            // For now, we assume the trigger on auth.users -> public.profiles exists or we rely on metadata sync.
            // However, to be safe and ensure the profile exists instantly for the UI:

            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    email: email,
                    name: name,
                    role: 'SELLER',
                    organization_id: organization_id
                })
                .select()
                .single();

            // Ignore duplicate key error if trigger already created it
            if (profileError && !profileError.message.includes('duplicate key')) {
                // If trigger failed or didn't exist, we might want to log it but not fail the request if auth succeeded
                request.log.warn({ profileError }, 'Profile creation warning');
            }

            return { success: true, user: { id: authData.user.id, email: authData.user.email } };

        } catch (error: any) {
            request.log.error({ error }, 'Failed to create user');
            return reply.code(500).send({ error: error.message || 'Failed to create user' });
        }
    });
}
