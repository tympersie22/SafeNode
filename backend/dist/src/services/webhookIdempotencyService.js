"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordWebhookEvent = recordWebhookEvent;
const crypto_1 = require("crypto");
const prisma_1 = require("../db/prisma");
async function recordWebhookEvent(provider, eventId, rawBody) {
    const prisma = (0, prisma_1.getPrismaClient)();
    const payloadHash = (0, crypto_1.createHash)('sha256').update(rawBody).digest('hex');
    try {
        await prisma.billingWebhookEvent.create({
            data: {
                provider,
                eventId,
                payloadHash,
            },
        });
        return 'new';
    }
    catch (error) {
        if (error?.code === 'P2002') {
            return 'duplicate';
        }
        throw error;
    }
}
