import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { env, config } from './shared/config/env.js';
import { logger } from './shared/utils/logger.js';
import { AppError } from './shared/errors/AppError.js';
import { routes } from './interfaces/http/routes/index.js';
import { websocketRoutes } from './infrastructure/websocket/server.js';

const server = Fastify({
    logger: config.isDev ? false : true, // We use pino logger manually in dev
});

// Register Plugins
server.register(cors, {
    origin: env.CORS_ORIGIN,
});

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
    try {
        await server.listen({ port: env.PORT, host: '0.0.0.0' });
        logger.info(`🚀 Server running on port ${env.PORT}`);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

start();
