"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportedPaddlePriceId = isSupportedPaddlePriceId;
exports.verifyPaddleSignature = verifyPaddleSignature;
exports.handlePaddleWebhookEvent = handlePaddleWebhookEvent;
exports.createPaddleCheckoutSession = createPaddleCheckoutSession;
const crypto_1 = require("crypto");
const prisma_1 = require("../db/prisma");
const userService_1 = require("./userService");
const auditLogService_1 = require("./auditLogService");
const PADDLE_PLAN_PRICE_IDS = {
    individual: [
        process.env.PADDLE_PRICE_INDIVIDUAL_MONTHLY || '',
        process.env.PADDLE_PRICE_INDIVIDUAL_ANNUAL || ''
    ].filter(Boolean),
    family: [
        process.env.PADDLE_PRICE_FAMILY_MONTHLY || '',
        process.env.PADDLE_PRICE_FAMILY_ANNUAL || ''
    ].filter(Boolean),
    teams: [
        process.env.PADDLE_PRICE_TEAMS_MONTHLY || '',
        process.env.PADDLE_PRICE_TEAMS_ANNUAL || ''
    ].filter(Boolean)
};
const ALL_PADDLE_PRICE_IDS = new Set(Object.values(PADDLE_PLAN_PRICE_IDS).flat());
function isSupportedPaddlePriceId(priceId) {
    return ALL_PADDLE_PRICE_IDS.has(priceId);
}
function parsePaddleSignatureHeader(header) {
    const parts = header
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean);
    let timestamp = '';
    const signatures = [];
    for (const part of parts) {
        const [key, value] = part.split('=');
        if (!key || !value)
            continue;
        if (key === 'ts')
            timestamp = value;
        if (key === 'h1')
            signatures.push(value);
    }
    return { timestamp, signatures };
}
function safeCompareHex(a, b) {
    try {
        const aBuf = Buffer.from(a, 'hex');
        const bBuf = Buffer.from(b, 'hex');
        if (aBuf.length !== bBuf.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(aBuf, bBuf);
    }
    catch {
        return false;
    }
}
function verifyPaddleSignature(rawBody, header, secret) {
    const { timestamp, signatures } = parsePaddleSignatureHeader(header);
    if (!timestamp || signatures.length === 0) {
        return false;
    }
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
        return false;
    }
    // Allow up to 5 minutes clock skew to mitigate replay attacks without rejecting valid events.
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > 300) {
        return false;
    }
    const signedPayload = `${timestamp}:${rawBody.toString('utf8')}`;
    const computed = (0, crypto_1.createHmac)('sha256', secret).update(signedPayload).digest('hex');
    return signatures.some((signature) => safeCompareHex(signature, computed));
}
function resolvePlanFromPriceId(priceId) {
    if (!priceId)
        return null;
    for (const [plan, ids] of Object.entries(PADDLE_PLAN_PRICE_IDS)) {
        if (ids.includes(priceId))
            return plan;
    }
    return null;
}
function mapPlanToTier(plan) {
    if (!plan)
        return 'free';
    if (plan === 'teams')
        return 'enterprise';
    return 'pro';
}
function normalizeSubscriptionStatus(status) {
    switch ((status || '').toLowerCase()) {
        case 'active':
            return 'active';
        case 'trialing':
            return 'trialing';
        case 'past_due':
            return 'past_due';
        case 'paused':
        case 'canceled':
            return 'cancelled';
        default:
            return 'past_due';
    }
}
function extractUserId(data) {
    const customData = data?.custom_data || data?.attributes?.custom_data;
    if (!customData || typeof customData !== 'object') {
        return null;
    }
    const candidates = [
        customData.userId,
        customData.user_id,
        customData.externalUserId,
        customData.external_user_id
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }
    return null;
}
function getFirstPriceId(data) {
    const items = data?.items || data?.attributes?.items;
    const firstItem = items?.[0];
    if (!firstItem)
        return 'paddle_unknown_price';
    if (typeof firstItem.price_id === 'string' && firstItem.price_id) {
        return firstItem.price_id;
    }
    if (typeof firstItem?.price?.id === 'string' && firstItem.price.id) {
        return firstItem.price.id;
    }
    return 'paddle_unknown_price';
}
function getEventData(event) {
    const data = event.data || {};
    return data?.attributes ? { ...data.attributes, id: data.id || data.attributes.id } : data;
}
function toDate(input, fallback) {
    if (!input)
        return fallback;
    const d = new Date(input);
    if (Number.isNaN(d.getTime()))
        return fallback;
    return d;
}
async function handlePaddleWebhookEvent(event) {
    if (!event?.event_type?.startsWith('subscription.')) {
        return;
    }
    const prisma = (0, prisma_1.getPrismaClient)();
    const data = getEventData(event);
    const subscriptionId = data.id;
    if (!subscriptionId || typeof subscriptionId !== 'string') {
        return;
    }
    const status = normalizeSubscriptionStatus(data.status);
    const priceId = getFirstPriceId(data);
    const plan = resolvePlanFromPriceId(priceId);
    const tier = mapPlanToTier(plan);
    const occurredAt = toDate(event.occurred_at, new Date());
    const periodStart = toDate(data?.current_billing_period?.starts_at || data?.billing_cycle?.starts_at || data?.started_at, occurredAt);
    const periodEnd = toDate(data?.current_billing_period?.ends_at || data?.billing_cycle?.ends_at || data?.next_billed_at, new Date(occurredAt.getTime() + 30 * 24 * 60 * 60 * 1000));
    const cancelAtPeriodEnd = Boolean(data?.scheduled_change?.action === 'cancel');
    let userId = extractUserId(data);
    const existing = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId }
    });
    if (!userId && existing) {
        userId = existing.userId;
    }
    if (!userId) {
        return;
    }
    if (existing) {
        await prisma.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
                stripePriceId: priceId,
                status,
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                cancelAtPeriodEnd
            }
        });
    }
    else {
        await prisma.subscription.create({
            data: {
                userId,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId,
                status,
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                cancelAtPeriodEnd
            }
        });
    }
    if (status === 'cancelled') {
        await (0, userService_1.updateUser)(userId, {
            subscriptionTier: 'free',
            subscriptionStatus: 'cancelled'
        });
    }
    else {
        await (0, userService_1.updateUser)(userId, {
            subscriptionTier: tier,
            subscriptionStatus: status
        });
    }
    await (0, auditLogService_1.createAuditLog)({
        userId,
        action: status === 'cancelled' ? 'subscription_cancelled' : 'subscription_created',
        resourceType: 'subscription',
        resourceId: subscriptionId,
        metadata: {
            provider: 'paddle',
            eventType: event.event_type,
            eventId: event.event_id,
            priceId,
            plan,
            status
        }
    });
}
async function createPaddleCheckoutSession(userId, priceId, successUrl, cancelUrl) {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
        throw new Error('Paddle is not configured. Set PADDLE_API_KEY.');
    }
    if (!isSupportedPaddlePriceId(priceId)) {
        throw new Error('Invalid Paddle price ID. Configure all PADDLE_PRICE_* environment variables first.');
    }
    const user = await (0, userService_1.findUserById)(userId);
    if (!user) {
        throw new Error('User not found');
    }
    const response = await fetch('https://api.paddle.com/transactions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            items: [{ price_id: priceId, quantity: 1 }],
            customer: {
                email: user.email
            },
            custom_data: {
                userId: user.id
            },
            checkout: {
                success_url: successUrl,
                cancel_url: cancelUrl
            }
        })
    });
    if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(`Failed to create Paddle checkout session (${response.status}): ${details}`);
    }
    const payload = await response.json();
    const checkoutUrl = payload?.data?.checkout?.url || payload?.data?.url;
    const transactionId = payload?.data?.id;
    if (!checkoutUrl || !transactionId) {
        throw new Error('Paddle transaction created but checkout URL was missing in response');
    }
    return {
        sessionId: String(transactionId),
        url: String(checkoutUrl)
    };
}
