"use strict";
/**
 * Stripe Service
 * Handles Stripe integration for subscriptions and billing
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
exports.SUBSCRIPTION_LIMITS = void 0;
exports.createCheckoutSession = createCheckoutSession;
exports.createPortalSession = createPortalSession;
exports.handleStripeWebhook = handleStripeWebhook;
exports.syncUserSubscriptionFromStripe = syncUserSubscriptionFromStripe;
exports.checkSubscriptionLimits = checkSubscriptionLimits;
// Stripe will be imported dynamically to avoid dependency issues
const userService_1 = require("./userService");
const prisma_1 = require("../db/prisma");
/**
 * Get Stripe instance (dynamic import)
 */
async function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) {
        return null;
    }
    try {
        // Dynamic import to avoid type checking issues
        // @ts-ignore - Stripe is installed but TypeScript may not resolve it
        const stripeModule = await Promise.resolve().then(() => __importStar(require('stripe')));
        const Stripe = stripeModule.default || stripeModule;
        // @ts-ignore - Stripe constructor is valid
        return new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-11-20.acacia',
            typescript: true
        });
    }
    catch (error) {
        console.error('Failed to load Stripe:', error);
        return null;
    }
}
const PLAN_PRICE_IDS = {
    individual: [
        process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY || '',
        process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL || '',
        process.env.STRIPE_PRICE_INDIVIDUAL || '' // backward compatibility
    ].filter(Boolean),
    family: [
        process.env.STRIPE_PRICE_FAMILY_MONTHLY || '',
        process.env.STRIPE_PRICE_FAMILY_ANNUAL || '',
        process.env.STRIPE_PRICE_FAMILY || '' // backward compatibility
    ].filter(Boolean),
    teams: [
        process.env.STRIPE_PRICE_TEAMS_MONTHLY || '',
        process.env.STRIPE_PRICE_TEAMS_ANNUAL || '',
        process.env.STRIPE_PRICE_TEAMS || '' // backward compatibility
    ].filter(Boolean)
};
const ALL_PRICE_IDS = new Set(Object.values(PLAN_PRICE_IDS).flat());
const PLAN_LIMITS = {
    free: {
        devices: 1,
        vaults: 1,
        teamMembers: 0,
        storageMB: 100
    },
    individual: {
        devices: 5,
        vaults: 5,
        teamMembers: 0,
        storageMB: 1024
    },
    family: {
        devices: 10,
        vaults: 20,
        teamMembers: 0,
        storageMB: 5120
    },
    teams: {
        devices: 50,
        vaults: 100,
        teamMembers: 50,
        storageMB: 10240
    }
};
// Subscription limits keyed by legacy/current tier names used across the app.
exports.SUBSCRIPTION_LIMITS = {
    free: PLAN_LIMITS.free,
    pro: PLAN_LIMITS.individual,
    enterprise: PLAN_LIMITS.teams,
    individual: PLAN_LIMITS.individual,
    family: PLAN_LIMITS.family,
    teams: PLAN_LIMITS.teams
};
function resolvePlanFromPriceId(priceId) {
    if (!priceId) {
        return null;
    }
    for (const [plan, ids] of Object.entries(PLAN_PRICE_IDS)) {
        if (ids.includes(priceId)) {
            return plan;
        }
    }
    return null;
}
function mapPlanToSubscriptionTier(plan) {
    if (plan === 'free')
        return 'free';
    if (plan === 'teams')
        return 'enterprise';
    return 'pro';
}
async function resolveUserPlan(userId, subscriptionTier) {
    const prisma = (0, prisma_1.getPrismaClient)();
    const activeSubscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: {
                in: ['active', 'trialing', 'past_due']
            }
        },
        orderBy: [{ currentPeriodEnd: 'desc' }, { createdAt: 'desc' }]
    });
    const planFromPrice = resolvePlanFromPriceId(activeSubscription?.stripePriceId);
    if (planFromPrice) {
        return planFromPrice;
    }
    if (subscriptionTier === 'enterprise')
        return 'teams';
    if (subscriptionTier === 'pro')
        return 'individual';
    return 'free';
}
/**
 * Create Stripe checkout session
 */
async function createCheckoutSession(userId, priceId, successUrl, cancelUrl) {
    const stripe = await getStripe();
    if (!stripe) {
        throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
    if (!ALL_PRICE_IDS.has(priceId)) {
        throw new Error('Invalid Stripe price ID. Configure STRIPE_PRICE_* environment variables first.');
    }
    const user = await (0, userService_1.findUserById)(userId);
    if (!user) {
        throw new Error('User not found');
    }
    // Get or create Stripe customer
    let customerId = user.stripeCustomerId || undefined;
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: user.email,
            name: user.displayName || undefined,
            metadata: {
                userId: user.id
            }
        });
        customerId = customer.id;
        // Save customer ID to user
        await (0, userService_1.updateUser)(userId, {
            stripeCustomerId: customerId
        });
    }
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId,
                quantity: 1
            }
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            userId: user.id
        }
    });
    if (!session.url) {
        throw new Error('Stripe checkout session was created but no URL was returned');
    }
    return {
        sessionId: session.id,
        url: session.url
    };
}
/**
 * Create Stripe customer portal session
 */
async function createPortalSession(userId, returnUrl) {
    const stripe = await getStripe();
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }
    const user = await (0, userService_1.findUserById)(userId);
    if (!user) {
        throw new Error('User not found');
    }
    if (!user.stripeCustomerId) {
        throw new Error('User does not have an active subscription');
    }
    const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl
    });
    return {
        url: session.url
    };
}
/**
 * Handle Stripe webhook event
 */
async function handleStripeWebhook(event) {
    const stripe = await getStripe();
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }
    const prisma = (0, prisma_1.getPrismaClient)();
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.metadata?.userId;
            if (!userId) {
                console.error('No userId in checkout session metadata');
                return;
            }
            // Get subscription
            const subscriptionId = session.subscription;
            if (!subscriptionId) {
                console.error('No subscription ID in checkout session');
                return;
            }
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items?.data?.[0]?.price?.id;
            if (!priceId) {
                console.error('No price ID in subscription');
                return;
            }
            const plan = resolvePlanFromPriceId(priceId) || 'individual';
            const subscriptionTier = mapPlanToSubscriptionTier(plan);
            // Update user subscription
            await (0, userService_1.updateUser)(userId, {
                subscriptionTier,
                subscriptionStatus: 'active',
                stripeSubscriptionId: subscriptionId
            });
            // Create subscription record
            await prisma.subscription.create({
                data: {
                    userId,
                    stripeSubscriptionId: subscriptionId,
                    stripePriceId: priceId,
                    status: subscription.status,
                    currentPeriodStart: new Date(subscription.current_period_start * 1000),
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
                }
            });
            break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            // Find subscription in database
            const dbSubscription = await prisma.subscription.findUnique({
                where: { stripeSubscriptionId: subscription.id }
            });
            if (!dbSubscription) {
                console.error('Subscription not found in database:', subscription.id);
                return;
            }
            const updatedPriceId = subscription.items?.data?.[0]?.price?.id;
            const updatedPlan = resolvePlanFromPriceId(updatedPriceId) || null;
            const nextSubscriptionTier = updatedPlan ? mapPlanToSubscriptionTier(updatedPlan) : null;
            // Update subscription record
            await prisma.subscription.update({
                where: { id: dbSubscription.id },
                data: {
                    stripePriceId: updatedPriceId || dbSubscription.stripePriceId,
                    status: subscription.status,
                    currentPeriodStart: new Date(subscription.current_period_start * 1000),
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
                }
            });
            // Update user subscription status
            const user = await prisma.user.findUnique({
                where: { id: dbSubscription.userId }
            });
            if (user) {
                if (subscription.status === 'active') {
                    await (0, userService_1.updateUser)(user.id, {
                        subscriptionStatus: 'active',
                        ...(nextSubscriptionTier ? { subscriptionTier: nextSubscriptionTier } : {})
                    });
                }
                else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
                    await (0, userService_1.updateUser)(user.id, {
                        subscriptionStatus: 'cancelled',
                        subscriptionTier: 'free'
                    });
                }
                else if (subscription.status === 'past_due') {
                    await (0, userService_1.updateUser)(user.id, {
                        subscriptionStatus: 'past_due'
                    });
                }
            }
            break;
        }
        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const subscriptionId = invoice.subscription;
            if (subscriptionId) {
                const dbSubscription = await prisma.subscription.findUnique({
                    where: { stripeSubscriptionId: subscriptionId }
                });
                if (dbSubscription) {
                    // Update subscription status to past_due
                    await prisma.subscription.update({
                        where: { id: dbSubscription.id },
                        data: { status: 'past_due' }
                    });
                    // Update user subscription status
                    await (0, userService_1.updateUser)(dbSubscription.userId, {
                        subscriptionStatus: 'past_due'
                    });
                    console.log('Invoice payment failed for subscription:', subscriptionId);
                }
            }
            break;
        }
        default:
            console.log('Unhandled Stripe webhook event:', event.type);
    }
}
/**
 * Sync user subscription from Stripe
 * Updates user's subscription tier and status based on current Stripe subscription
 */
async function syncUserSubscriptionFromStripe(userId) {
    const user = await (0, userService_1.findUserById)(userId);
    if (!user || !user.stripeSubscriptionId) {
        return;
    }
    const stripe = await getStripe();
    if (!stripe) {
        return;
    }
    try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = resolvePlanFromPriceId(priceId) || 'free';
        const subscriptionTier = mapPlanToSubscriptionTier(plan);
        // Update user subscription tier and status
        await (0, userService_1.updateUser)(userId, {
            subscriptionTier,
            subscriptionStatus: subscription.status === 'active' ? 'active' :
                subscription.status === 'canceled' || subscription.status === 'unpaid' ? 'cancelled' : 'past_due'
        });
    }
    catch (error) {
        // If sync fails, don't throw - just log
        console.error('Failed to sync subscription from Stripe:', error);
    }
}
/**
 * Check subscription limits for a user
 */
async function checkSubscriptionLimits(userId, resource) {
    const user = await (0, userService_1.findUserById)(userId);
    if (!user) {
        return { allowed: false, current: 0, limit: 0 };
    }
    const plan = await resolveUserPlan(userId, user.subscriptionTier);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    // Get current usage
    const prisma = (0, prisma_1.getPrismaClient)();
    let current = 0;
    switch (resource) {
        case 'devices':
            current = await prisma.device.count({
                where: { userId, isActive: true }
            });
            break;
        case 'vaults':
            // Count team vaults for user
            const teamIds = await prisma.teamMember.findMany({
                where: { userId },
                select: { teamId: true }
            });
            current = await prisma.teamVault.count({
                where: { teamId: { in: teamIds.map(t => t.teamId) } }
            });
            break;
        case 'teamMembers':
            const teams = await prisma.teamMember.findMany({
                where: { userId, role: { in: ['owner', 'admin'] } },
                select: { teamId: true }
            });
            current = await prisma.teamMember.count({
                where: { teamId: { in: teams.map(t => t.teamId) } }
            });
            break;
        case 'storage':
            // This would require calculating vault size - simplified for now
            current = 0;
            break;
    }
    const limit = resource === 'storage' ? limits.storageMB : limits[resource];
    const allowed = limit === -1 || current < limit;
    return {
        allowed,
        current,
        limit
    };
}
