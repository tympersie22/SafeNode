"use strict";
/**
 * Per-User Rate Limiting Middleware
 * Rate limiting based on user ID and subscription tier
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.perUserRateLimit = perUserRateLimit;
exports.registerPerUserRateLimit = registerPerUserRateLimit;
exports.clearUserRateLimit = clearUserRateLimit;
exports.getUserRateLimitStatus = getUserRateLimitStatus;
const userService_1 = require("../services/userService");
const stripeService_1 = require("../services/stripeService");
const rateLimitStore = new Map();
// Clean up expired records every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);
// Rate limits per tier (requests per minute)
const TIER_RATE_LIMITS = {
    free: 100,
    pro: 500,
    individual: 500,
    family: 1000,
    teams: 5000,
    enterprise: -1 // unlimited
};
/**
 * Get rate limit for a subscription tier
 */
function getRateLimitForTier(tier) {
    return TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS.free;
}
/**
 * Generate rate limit key
 */
function generateKey(userId, endpoint) {
    return endpoint ? `rate:${userId}:${endpoint}` : `rate:${userId}`;
}
/**
 * Check if request exceeds rate limit
 */
async function checkRateLimit(userId, tier, endpoint) {
    // Dev-only bypass flag (check environment variable)
    if (process.env.RATE_LIMIT_BYPASS === 'true' || process.env.NODE_ENV === 'development') {
        // Allow bypass in development if flag is set
        if (process.env.RATE_LIMIT_BYPASS === 'true') {
            return {
                allowed: true,
                remaining: -1,
                resetAt: Date.now() + 60000
            };
        }
    }
    const limit = getRateLimitForTier(tier);
    // Enterprise tier has unlimited requests
    if (limit === -1) {
        return {
            allowed: true,
            remaining: -1,
            resetAt: Date.now() + 60000
        };
    }
    const key = generateKey(userId, endpoint);
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const resetAt = now + windowMs;
    let record = rateLimitStore.get(key);
    // Reset if window expired
    if (!record || now > record.resetAt) {
        record = {
            count: 0,
            resetAt
        };
    }
    record.count++;
    rateLimitStore.set(key, record);
    const remaining = Math.max(0, limit - record.count);
    const allowed = record.count <= limit;
    return {
        allowed,
        remaining,
        resetAt: record.resetAt
    };
}
/**
 * Per-user rate limiting middleware
 * Must be used after authentication middleware
 */
async function perUserRateLimit(request, reply) {
    const user = request.user;
    // If no user, skip per-user rate limiting (use IP-based rate limiting instead)
    if (!user || !user.id) {
        return;
    }
    try {
        // Get user's subscription tier
        let userRecord = await (0, userService_1.findUserById)(user.id);
        if (!userRecord) {
            return; // User not found, let other middleware handle it
        }
        // Sync subscription from Stripe if user has Stripe subscription ID
        // This ensures rate limits reflect current Stripe subscription status
        if (userRecord.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
            try {
                // Sync subscription (this will update user's subscriptionTier if changed in Stripe)
                await (0, stripeService_1.syncUserSubscriptionFromStripe)(user.id);
                // Re-fetch user to get updated tier
                userRecord = await (0, userService_1.findUserById)(user.id);
                if (!userRecord) {
                    return;
                }
            }
            catch (error) {
                // If sync fails, log but continue with current tier
                request.log.warn({ error, userId: user.id }, 'Failed to sync subscription from Stripe');
            }
        }
        const tier = userRecord.subscriptionTier || 'free';
        const endpoint = request.routeOptions?.url || request.url;
        const result = await checkRateLimit(user.id, tier, endpoint);
        // Add rate limit headers
        reply.header('X-RateLimit-Limit', getRateLimitForTier(tier).toString());
        reply.header('X-RateLimit-Remaining', result.remaining === -1 ? 'unlimited' : result.remaining.toString());
        reply.header('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
        if (!result.allowed) {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            reply.header('Retry-After', retryAfter.toString());
            return reply.code(429).send({
                error: 'rate_limit_exceeded',
                message: `Rate limit exceeded for tier ${tier}. Maximum ${getRateLimitForTier(tier)} requests per minute.`,
                retryAfter,
                tier,
                limit: getRateLimitForTier(tier)
            });
        }
    }
    catch (error) {
        // If rate limiting fails, log error but allow request
        request.log.error({ error }, 'Rate limit check failed');
        // Don't block request on rate limit errors
    }
}
/**
 * Register per-user rate limiting for specific routes
 */
function registerPerUserRateLimit(server, routes = []) {
    if (routes.length === 0) {
        // Apply to all routes
        server.addHook('onRequest', perUserRateLimit);
    }
    else {
        // Apply to specific routes only
        server.addHook('onRequest', async (request, reply) => {
            const route = request.routeOptions?.url || request.url;
            if (routes.some(r => route.startsWith(r))) {
                return perUserRateLimit(request, reply);
            }
        });
    }
}
/**
 * Clear rate limit for a user (useful for testing or admin actions)
 */
function clearUserRateLimit(userId, endpoint) {
    const key = generateKey(userId, endpoint);
    rateLimitStore.delete(key);
}
/**
 * Get rate limit status for a user
 */
async function getUserRateLimitStatus(userId) {
    const user = await (0, userService_1.findUserById)(userId);
    if (!user) {
        throw new Error('User not found');
    }
    const tier = user.subscriptionTier || 'free';
    const limit = getRateLimitForTier(tier);
    const key = generateKey(userId);
    const record = rateLimitStore.get(key);
    if (!record || Date.now() > record.resetAt) {
        return {
            tier,
            limit,
            current: 0,
            remaining: limit === -1 ? -1 : limit
        };
    }
    return {
        tier,
        limit,
        current: record.count,
        remaining: limit === -1 ? -1 : Math.max(0, limit - record.count)
    };
}
