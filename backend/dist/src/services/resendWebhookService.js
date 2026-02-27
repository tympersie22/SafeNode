"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyResendWebhookSignature = verifyResendWebhookSignature;
const crypto_1 = require("crypto");
function extractV1Signatures(signatureHeader) {
    return signatureHeader
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
        const [version, signature] = part.split(',');
        if (version === 'v1' && signature)
            return signature;
        return null;
    })
        .filter((value) => Boolean(value));
}
function verifyResendWebhookSignature(rawBody, headers, webhookSecret) {
    const payloadToSign = `${headers.id}.${headers.timestamp}.${rawBody.toString('utf8')}`;
    const normalizedSecret = webhookSecret.startsWith('whsec_')
        ? webhookSecret.slice('whsec_'.length)
        : webhookSecret;
    const secretBytes = Buffer.from(normalizedSecret, 'base64');
    const expected = (0, crypto_1.createHmac)('sha256', secretBytes).update(payloadToSign).digest('base64');
    const expectedBuffer = Buffer.from(expected);
    const signatures = extractV1Signatures(headers.signature);
    if (signatures.length === 0)
        return false;
    for (const candidate of signatures) {
        const candidateBuffer = Buffer.from(candidate);
        if (candidateBuffer.length === expectedBuffer.length &&
            (0, crypto_1.timingSafeEqual)(candidateBuffer, expectedBuffer)) {
            return true;
        }
    }
    return false;
}
