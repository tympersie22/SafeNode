"use strict";
/**
 * Structured Logging Middleware
 * Enhanced logging with correlation IDs and structured data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCorrelationId = addCorrelationId;
exports.logRequest = logRequest;
exports.logError = logError;
exports.registerStructuredLogging = registerStructuredLogging;
const crypto_1 = require("crypto");
// Generate correlation ID
function generateCorrelationId() {
    return (0, crypto_1.randomBytes)(16).toString('hex');
}
const logBatch = [];
const BATCH_SIZE = 50;
const BATCH_INTERVAL = 5000; // 5 seconds
// Sanitize sensitive fields from logs
function sanitizeLogData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken', 'authorization'];
    const sanitized = { ...data };
    for (const key in sanitized) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeLogData(sanitized[key]);
        }
    }
    return sanitized;
}
// Process batched logs
function processBatchedLogs(server) {
    if (logBatch.length === 0)
        return;
    const logsToProcess = logBatch.splice(0, BATCH_SIZE);
    for (const batchedLog of logsToProcess) {
        const sanitizedLog = {
            ...batchedLog.log,
            metadata: sanitizeLogData(batchedLog.log.metadata),
            error: batchedLog.log.error ? {
                ...batchedLog.log.error,
                stack: batchedLog.log.error.stack ? '[REDACTED]' : undefined
            } : undefined
        };
        if (sanitizedLog.level === 'error') {
            server.log.error(sanitizedLog);
        }
        else if (sanitizedLog.level === 'warn') {
            server.log.warn(sanitizedLog);
        }
        else {
            server.log.info(sanitizedLog);
        }
    }
}
// Start batch processing interval
let batchInterval = null;
function startBatchProcessing(server) {
    if (batchInterval)
        return;
    batchInterval = setInterval(() => {
        processBatchedLogs(server);
    }, BATCH_INTERVAL);
}
function stopBatchProcessing() {
    if (batchInterval) {
        clearInterval(batchInterval);
        batchInterval = null;
    }
}
/**
 * Add correlation ID to requests
 */
function addCorrelationId(request, reply) {
    const correlationId = request.headers['x-correlation-id'] || generateCorrelationId();
    request.correlationId = correlationId;
    // Add to response headers
    reply.header('X-Correlation-ID', correlationId);
}
/**
 * Structured request logging
 */
function logRequest(request, reply, payload) {
    const correlationId = request.correlationId;
    const userId = request.user?.id;
    const startTime = request.startTime || Date.now();
    const duration = Date.now() - startTime;
    const log = {
        level: reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info',
        message: `${request.method} ${request.url} - ${reply.statusCode}`,
        correlationId,
        userId,
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
        timestamp: new Date().toISOString()
    };
    // Add error details if status is error
    if (reply.statusCode >= 400) {
        const error = reply.error;
        if (error) {
            log.error = {
                name: error.name || 'Error',
                message: error.message || 'Unknown error',
                stack: error.stack
            };
        }
    }
    // Sanitize sensitive data
    const sanitizedLog = {
        ...log,
        metadata: sanitizeLogData(request.logMetadata || {}),
        error: log.error ? {
            ...log.error,
            stack: process.env.NODE_ENV === 'production' ? '[REDACTED]' : log.error.stack
        } : undefined
    };
    // Log using Fastify's logger
    if (sanitizedLog.level === 'error') {
        request.log.error(sanitizedLog);
    }
    else if (sanitizedLog.level === 'warn') {
        request.log.warn(sanitizedLog);
    }
    else {
        request.log.info(sanitizedLog);
    }
    return payload;
}
/**
 * Log errors with full context
 */
function logError(error, request, reply) {
    const correlationId = request.correlationId;
    const userId = request.user?.id;
    const errorLog = {
        level: 'error',
        message: error.message || 'Unhandled error',
        correlationId,
        userId,
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode || 500,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        metadata: {
            headers: request.headers,
            query: request.query,
            params: request.params,
            body: request.body // Be careful not to log sensitive data
        },
        timestamp: new Date().toISOString()
    };
    request.log.error(errorLog);
}
/**
 * Register structured logging middleware
 */
function registerStructuredLogging(server) {
    // Add correlation ID to requests
    server.addHook('onRequest', (request, reply) => {
        request.startTime = Date.now();
        addCorrelationId(request, reply);
    });
    // Log requests
    server.addHook('onSend', logRequest);
    // Log errors (with sanitization)
    server.setErrorHandler((error, request, reply) => {
        const sanitizedError = {
            ...error,
            message: error.message || 'An unexpected error occurred',
            stack: process.env.NODE_ENV === 'production' ? '[REDACTED]' : error.stack
        };
        logError(sanitizedError, request, reply);
        // Return error response
        reply.code(error.statusCode || 500).send({
            error: error.name || 'InternalServerError',
            message: error.message || 'An unexpected error occurred',
            correlationId: request.correlationId
        });
    });
    // Start batch processing
    startBatchProcessing(server);
    // Cleanup on shutdown
    process.on('SIGTERM', () => {
        stopBatchProcessing();
        // Process remaining logs
        processBatchedLogs(server);
    });
    process.on('SIGINT', () => {
        stopBatchProcessing();
        // Process remaining logs
        processBatchedLogs(server);
    });
    // Activity logging helper
    server.decorate('logActivity', (activity) => {
        const request = server.requestContext?.request;
        const correlationId = request?.correlationId || generateCorrelationId();
        const userId = activity.userId || request?.user?.id;
        const activityLog = {
            level: 'info',
            message: `Activity: ${activity.action}`,
            correlationId,
            userId,
            metadata: sanitizeLogData({
                action: activity.action,
                resourceType: activity.resourceType,
                resourceId: activity.resourceId,
                ...activity.metadata
            }),
            timestamp: new Date().toISOString()
        };
        // Add to batch for processing
        logBatch.push({
            log: activityLog,
            timestamp: Date.now()
        });
        // Process immediately if batch is full
        if (logBatch.length >= BATCH_SIZE) {
            processBatchedLogs(server);
        }
    });
}
