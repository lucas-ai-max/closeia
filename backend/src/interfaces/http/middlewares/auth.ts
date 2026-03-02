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
            logger.warn({ err: error }, 'Auth: Invalid token');
            throw new UnauthorizedError('Invalid token');
        }

        logger.debug({ userId: user.id }, 'Auth: User found');

        // Get User Profile with Organization
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*, organizations(*)')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            logger.warn({ err: profileError }, 'Auth: Profile not found or error');
            logger.error(`❌ Profile not found for user ${user.id}`);
            throw new UnauthorizedError('Profile not found');
        }

        logger.debug({ role: profile.role }, 'Auth: Profile found');

        // Attach user profile to request
        request.user = profile;

    } catch (error) {
        logger.warn({ err: error }, 'Auth: Middleware catch');
        if (error instanceof UnauthorizedError) {
            return reply.status(401).send({ error: error.message });
        }
        logger.error({ err: error }, 'Auth middleware error');
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
}
