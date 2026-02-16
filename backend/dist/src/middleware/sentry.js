"use strict";
/**
 * Sentry Middleware
 * Error tracking middleware for Fastify
 * Note: Install @sentry/node to enable error tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSentryMiddleware = registerSentryMiddleware;
let Sentry = null;
// Try to import Sentry, but don't fail if not installed
try {
    Sentry = require('@sentry/node');
}
catch {
    // Sentry not installed, will skip initialization
    console.warn('⚠️  @sentry/node not installed. Error tracking middleware is disabled.');
}
/**
 * Register Sentry error tracking middleware
 */
async function registerSentryMiddleware(server) {
    // Skip if Sentry is not installed
    if (!Sentry) {
        return;
    }
    // Error handler for Sentry
    server.setErrorHandler(async (error, request, reply) => {
        // Log error to Sentry
        Sentry.withScope((scope) => {
            scope.setContext('request', {
                method: request.method,
                url: request.url,
                headers: {
                    'user-agent': request.headers['user-agent'],
                    'referer': request.headers['referer']
                },
                ip: request.ip
            });
            // Add user context if authenticated
            const user = request.user;
            if (user) {
                scope.setUser({
                    id: user.id,
                    email: user.email
                });
            }
            Sentry.captureException(error);
        });
        // Continue with default error handler
        reply.send(error);
    });
    // Request tracking
    server.addHook('onRequest', async (request, reply) => {
        // Start transaction for performance monitoring
        const transaction = Sentry.startTransaction({
            op: 'http.server',
            name: `${request.method} ${request.url}`
        });
        request.__sentryTransaction = transaction;
    });
    server.addHook('onResponse', async (request, reply) => {
        const transaction = request.__sentryTransaction;
        if (transaction && typeof transaction.setHttpStatus === 'function') {
            transaction.setHttpStatus(reply.statusCode);
            if (typeof transaction.finish === 'function') {
                transaction.finish();
            }
        }
    });
}
