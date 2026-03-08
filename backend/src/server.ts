import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { env, config } from './shared/config/env.js';
import { logger } from './shared/utils/logger.js';
import { AppError } from './shared/errors/AppError.js';
import { routes } from './interfaces/http/routes/index.js';
import { websocketRoutes } from './infrastructure/websocket/server.js';

const server = Fastify({
    logger: config.isDev ? false : true, // We use pino logger manually in dev
});

// DEBUG LOGGING (uses structured logger instead of sync file I/O)
function debugLog(msg: string) {
    logger.debug(msg);
}

// Register Plugins
server.register(cors, {
    origin: (origin, cb) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return cb(null, true);

        // Check if origin matches allowed list
        const allowedOrigins = env.CORS_ORIGIN.split(',');

        // Logic: Exato match, Wildcard, ou Chrome Extension
        if (
            allowedOrigins.indexOf(origin) !== -1 ||
            env.CORS_ORIGIN === '*' ||
            origin.startsWith('chrome-extension://')
        ) {
            cb(null, true);
        } else {
            logger.warn({ origin }, 'CORS blocked');
            cb(new Error(`Not allowed by CORS: ${origin}`), false);
        }
    },
    methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'POST', 'PATCH', 'OPTIONS'],
});

server.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max
server.register(websocket);

// Register Routes
server.register(routes, { prefix: '/api' });
server.register(websocketRoutes);

// Global Error Handler
server.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
            status: 'error',
            code: error.code,
            message: error.message,
        });
    }

    logger.error(error);

    return reply.status(500).send({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
    });
});

// Start Server
const start = async () => {
    if (config.isProd) {
        const missing: string[] = [];
        if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
        if (!env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
        if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
        if (!env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
        if (!env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
        if (!env.STRIPE_WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET');
        if (missing.length > 0) {
            logger.warn({ missing }, '⚠️ Cloud Run: set these env vars in the service for full functionality');
        }
    }
    try {
        await server.listen({ port: env.PORT, host: '0.0.0.0' });
        logger.info(`🚀 Server running on port ${env.PORT}`);
        const { startReprocessJob } = await import('./application/reprocess-call-summary.js');
        startReprocessJob();
        logger.info('Server restarted');
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

// Graceful Shutdown
async function gracefulShutdown(signal: string) {
    logger.info({ signal }, 'Received shutdown signal, closing server');
    try {
        await server.close();
        logger.info('Server closed gracefully');
        process.exit(0);
    } catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        process.exit(1);
    }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Global Error Handlers to prevent crash
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, '🔥 UNCAUGHT EXCEPTION - Process staying alive (investigate!)');
    debugLog(`🔥 UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason }, '🚨 UNHANDLED REJECTION');
    debugLog(`🚨 UNHANDLED REJECTION: ${JSON.stringify(reason)}`);
});

start();
