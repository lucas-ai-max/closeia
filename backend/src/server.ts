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

import fs from 'fs';
import path from 'path';

// DEBUG LOGGING FILE
const LOG_FILE = path.join(process.cwd(), 'backend-debug.log');

function debugLog(msg: string) {
    try {
        fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {
        console.error('Failed to write to log file', e);
    }
}

// Register Plugins
server.register(cors, {
    origin: (origin, cb) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return cb(null, true);

        // Check if origin matches allowed list
        const allowedOrigins = env.CORS_ORIGIN.split(',');
        if (allowedOrigins.indexOf(origin) !== -1 || env.CORS_ORIGIN === '*') {
            cb(null, true);
        } else {
            cb(new Error('Not allowed by CORS'), false);
        }
    },
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
        console.log('🔄 SERVER RESTARTED - CHECKING WATCHER');
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
};

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
