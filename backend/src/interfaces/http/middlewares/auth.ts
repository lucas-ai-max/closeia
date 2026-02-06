import { FastifyReply, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../../../infrastructure/supabase/client.js';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import { logger } from '../../../shared/utils/logger.js';

// Extend FastifyRequest to include user
declare module 'fastify' {
    interface FastifyRequest {
        user?: any;
    }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.replace('Bearer ', '');

        // Validate JWT User
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            throw new UnauthorizedError('Invalid token');
        }

        // Get User Profile with Organization
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*, organizations(*)')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            logger.error(`❌ Profile not found for user ${user.id}`);
            throw new UnauthorizedError('Profile not found');
        }

        // Attach user profile to request
        request.user = profile;

    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return reply.status(401).send({ error: error.message });
        }
        logger.error('Auth middleware error:', error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
}
