"use strict";
/**
 * Billing Routes
 * Stripe subscription and billing endpoints
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBillingRoutes = registerBillingRoutes;
const auth_1 = require("../middleware/auth");
const config_1 = require("../config");
const stripeService_1 = require("../services/stripeService");
const paddleService_1 = require("../services/paddleService");
const webhookIdempotencyService_1 = require("../services/webhookIdempotencyService");
// Stripe will be imported dynamically
const zod_1 = require("zod");
const checkoutSchema = zod_1.z.object({
    priceId: zod_1.z.string().min(1, 'Price ID is required'),
    successUrl: zod_1.z.string().url('Success URL must be a valid URL'),
    cancelUrl: zod_1.z.string().url('Cancel URL must be a valid URL')
});
const portalSchema = zod_1.z.object({
    returnUrl: zod_1.z.string().url('Return URL must be a valid URL')
});
/**
 * Register billing routes
 */
async function registerBillingRoutes(server) {
    /**
     * POST /api/billing/create-checkout-session
     * Create Stripe checkout session (requires authentication)
     */
    server.post('/api/billing/create-checkout-session', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            // Validate input
            const validation = checkoutSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { priceId, successUrl, cancelUrl } = validation.data;
            const session = config_1.config.billingProvider === 'paddle'
                ? await (0, paddleService_1.createPaddleCheckoutSession)(user.id, priceId, successUrl, cancelUrl)
                : await (0, stripeService_1.createCheckoutSession)(user.id, priceId, successUrl, cancelUrl);
            return {
                success: true,
                sessionId: session.sessionId,
                url: session.url
            };
        }
        catch (error) {
            request.log.error(error);
            if (error?.message?.includes('Invalid Stripe price ID') || error?.message?.includes('Invalid Paddle price ID')) {
                return reply.code(400).send({
                    error: 'invalid_price_id',
                    message: error.message
                });
            }
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to create checkout session'
            });
        }
    });
    /**
     * POST /api/billing/portal
     * Create Stripe customer portal session (requires authentication)
     */
    server.post('/api/billing/portal', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            // Validate input
            const validation = portalSchema.safeParse(body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid input',
                    details: validation.error.errors
                });
            }
            const { returnUrl } = validation.data;
            // Create portal session
            const session = await (0, stripeService_1.createPortalSession)(user.id, returnUrl);
            return {
                success: true,
                url: session.url
            };
        }
        catch (error) {
            request.log.error(error);
            if (error.message?.includes('does not have an active subscription')) {
                return reply.code(400).send({
                    error: 'no_subscription',
                    message: 'User does not have an active subscription'
                });
            }
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to create portal session'
            });
        }
    });
    /**
     * POST /api/billing/webhook
     * Handle Stripe webhook events (public endpoint with signature verification)
     */
    server.post('/api/billing/webhook', {
        config: { rawBody: true }
    }, async (request, reply) => {
        try {
            // Dynamic import to avoid type checking issues
            // @ts-ignore - Stripe is installed but TypeScript may not resolve it
            const stripeModule = await Promise.resolve().then(() => __importStar(require('stripe')));
            const Stripe = stripeModule.default || stripeModule;
            const stripe = process.env.STRIPE_SECRET_KEY
                // @ts-ignore - Stripe constructor is valid
                ? new Stripe(process.env.STRIPE_SECRET_KEY, {
                    apiVersion: '2024-11-20.acacia',
                    typescript: true
                })
                : null;
            if (!stripe) {
                return reply.code(500).send({
                    error: 'stripe_not_configured',
                    message: 'Stripe is not configured'
                });
            }
            const signature = request.headers['stripe-signature'];
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
            if (!signature || !webhookSecret) {
                return reply.code(400).send({
                    error: 'missing_signature',
                    message: 'Stripe signature or webhook secret is missing'
                });
            }
            // Verify webhook signature
            let event;
            const rawBody = request.rawBody;
            if (!rawBody) {
                request.log.error('Raw body not available for webhook signature verification');
                return reply.code(500).send({
                    error: 'server_error',
                    message: 'Raw body not available for webhook verification'
                });
            }
            try {
                event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
            }
            catch (err) {
                request.log.error({ error: err }, 'Webhook signature verification failed');
                return reply.code(400).send({
                    error: 'invalid_signature',
                    message: 'Invalid webhook signature'
                });
            }
            // Handle webhook event
            const eventStatus = await (0, webhookIdempotencyService_1.recordWebhookEvent)('stripe', event.id, rawBody);
            if (eventStatus === 'duplicate') {
                return { received: true, duplicate: true };
            }
            await (0, stripeService_1.handleStripeWebhook)(event);
            return { received: true };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to process webhook'
            });
        }
    });
    /**
     * POST /api/billing/paddle/webhook
     * Handle Paddle webhook events (public endpoint with signature verification)
     */
    server.post('/api/billing/paddle/webhook', {
        config: { rawBody: true }
    }, async (request, reply) => {
        try {
            const signature = (request.headers['paddle-signature'] || request.headers['Paddle-Signature']);
            const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
            if (!signature || !webhookSecret) {
                return reply.code(400).send({
                    error: 'missing_signature',
                    message: 'Paddle signature or webhook secret is missing'
                });
            }
            const rawBody = request.rawBody;
            if (!rawBody) {
                request.log.error('Raw body not available for Paddle webhook signature verification');
                return reply.code(500).send({
                    error: 'server_error',
                    message: 'Raw body not available for webhook verification'
                });
            }
            const isValid = (0, paddleService_1.verifyPaddleSignature)(rawBody, signature, webhookSecret);
            if (!isValid) {
                return reply.code(400).send({
                    error: 'invalid_signature',
                    message: 'Invalid Paddle webhook signature'
                });
            }
            const event = JSON.parse(rawBody.toString('utf8'));
            if (event?.event_id) {
                const eventStatus = await (0, webhookIdempotencyService_1.recordWebhookEvent)('paddle', event.event_id, rawBody);
                if (eventStatus === 'duplicate') {
                    return { received: true, duplicate: true };
                }
            }
            await (0, paddleService_1.handlePaddleWebhookEvent)(event);
            return { received: true };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to process Paddle webhook'
            });
        }
    });
    /**
     * GET /api/billing/limits
     * Get subscription limits for current user (requires authentication)
     */
    server.get('/api/billing/limits', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const user = request.user;
            const query = request.query;
            const resource = query.resource;
            if (resource) {
                // Check single resource limit
                const limit = await (0, stripeService_1.checkSubscriptionLimits)(user.id, resource);
                return {
                    resource,
                    allowed: limit.allowed,
                    current: limit.current,
                    limit: limit.limit
                };
            }
            else {
                // Return all limits
                const devices = await (0, stripeService_1.checkSubscriptionLimits)(user.id, 'devices');
                const vaults = await (0, stripeService_1.checkSubscriptionLimits)(user.id, 'vaults');
                const teamMembers = await (0, stripeService_1.checkSubscriptionLimits)(user.id, 'teamMembers');
                const storage = await (0, stripeService_1.checkSubscriptionLimits)(user.id, 'storage');
                return {
                    devices: {
                        allowed: devices.allowed,
                        current: devices.current,
                        limit: devices.limit
                    },
                    vaults: {
                        allowed: vaults.allowed,
                        current: vaults.current,
                        limit: vaults.limit
                    },
                    teamMembers: {
                        allowed: teamMembers.allowed,
                        current: teamMembers.current,
                        limit: teamMembers.limit
                    },
                    storage: {
                        allowed: storage.allowed,
                        current: storage.current,
                        limit: storage.limit
                    }
                };
            }
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error?.message || 'server_error',
                message: 'Failed to fetch subscription limits'
            });
        }
    });
}
