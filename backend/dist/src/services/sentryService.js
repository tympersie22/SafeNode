"use strict";
/**
 * Sentry Service
 * Error tracking and monitoring for production
 * Note: Install @sentry/node and @sentry/profiling-node to enable error tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSentry = initSentry;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
exports.addBreadcrumb = addBreadcrumb;
exports.setUser = setUser;
exports.clearUser = clearUser;
exports.startTransaction = startTransaction;
let Sentry = null;
let ProfilingIntegration = null;
let isInitialized = false;
// Try to import Sentry, but don't fail if not installed
try {
    Sentry = require('@sentry/node');
    ProfilingIntegration = require('@sentry/profiling-node').ProfilingIntegration;
}
catch {
    // Sentry not installed, will skip initialization
    console.warn('⚠️  @sentry/node not installed. Error tracking is disabled.');
}
const config_1 = require("../config");
/**
 * Initialize Sentry for backend
 */
function initSentry() {
    if (isInitialized)
        return;
    // Skip if Sentry is not installed
    if (!Sentry) {
        return;
    }
    const dsn = process.env.SENTRY_DSN || process.env.SENTRY_DSN_BACKEND;
    if (!dsn && config_1.config.nodeEnv === 'production') {
        console.warn('⚠️  Sentry DSN not configured. Error tracking will not work in production.');
        return;
    }
    if (!dsn) {
        // Skip initialization in development if DSN not provided
        return;
    }
    try {
        Sentry.init({
            dsn,
            environment: config_1.config.nodeEnv,
            integrations: [
                // Automatically instrument Node.js libraries and frameworks
                new Sentry.Integrations.Http({ tracing: true }),
                new Sentry.Integrations.Express({ app: undefined }), // Will be set later
                ProfilingIntegration ? new ProfilingIntegration() : undefined
            ].filter(Boolean),
            // Performance Monitoring
            tracesSampleRate: config_1.config.nodeEnv === 'production' ? 0.1 : 1.0, // 10% of transactions in prod
            profilesSampleRate: config_1.config.nodeEnv === 'production' ? 0.1 : 1.0, // 10% of profiles in prod
            // Release tracking
            release: process.env.npm_package_version || 'unknown',
            // Filter out health checks and noise
            ignoreErrors: [
                'ECONNRESET',
                'ECONNREFUSED',
                'ETIMEDOUT',
                'ENOTFOUND'
            ],
            // Configure what data to send
            beforeSend(event, hint) {
                // Don't send events in development unless explicitly enabled
                if (config_1.config.nodeEnv === 'development' && !process.env.SENTRY_ENABLED_IN_DEV) {
                    return null;
                }
                // Filter sensitive data
                if (event.request) {
                    // Remove sensitive headers
                    if (event.request.headers) {
                        delete event.request.headers.authorization;
                        delete event.request.headers.cookie;
                    }
                    // Remove sensitive query params
                    if (event.request.query_string) {
                        const query = new URLSearchParams(event.request.query_string);
                        query.delete('password');
                        query.delete('token');
                        event.request.query_string = query.toString();
                    }
                }
                return event;
            }
        });
        isInitialized = true;
        console.log('✅ Sentry initialized for backend');
    }
    catch (error) {
        console.error('❌ Failed to initialize Sentry:', error);
    }
}
/**
 * Capture an exception
 */
function captureException(error, context) {
    if (!isInitialized || !Sentry)
        return;
    Sentry.withScope((scope) => {
        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                scope.setContext(key, value);
            });
        }
        Sentry.captureException(error);
    });
}
/**
 * Capture a message
 */
function captureMessage(message, level = 'info') {
    if (!isInitialized || !Sentry)
        return;
    Sentry.captureMessage(message, level);
}
/**
 * Add breadcrumb for debugging
 */
function addBreadcrumb(message, category, data) {
    if (!isInitialized || !Sentry)
        return;
    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info'
    });
}
/**
 * Set user context
 */
function setUser(user) {
    if (!isInitialized || !Sentry)
        return;
    Sentry.setUser(user);
}
/**
 * Clear user context
 */
function clearUser() {
    if (!isInitialized || !Sentry)
        return;
    Sentry.setUser(null);
}
/**
 * Start a transaction for performance monitoring
 */
function startTransaction(name, op) {
    if (!isInitialized || !Sentry)
        return null;
    return Sentry.startTransaction({ name, op });
}
