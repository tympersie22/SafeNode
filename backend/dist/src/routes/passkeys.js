"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPasskeyRoutes = registerPasskeyRoutes;
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../db/prisma");
const webauthnService_1 = require("../services/webauthnService");
async function registerPasskeyRoutes(server) {
    server.get('/api/passkeys', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const prisma = (0, prisma_1.getPrismaClient)();
            const creds = await prisma.webAuthnCredential.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
            });
            return {
                passkeys: creds.map((c) => ({
                    id: c.credentialId,
                    transports: c.transports,
                    signCount: Number(c.counter),
                    friendlyName: c.deviceType || 'Passkey',
                    createdAt: c.createdAt.getTime(),
                })),
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'server_error', message: 'Failed to load passkeys' });
        }
    });
    server.delete('/api/passkeys/:id', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const { id } = request.params;
            const prisma = (0, prisma_1.getPrismaClient)();
            await prisma.webAuthnCredential.deleteMany({
                where: {
                    userId: user.id,
                    credentialId: id,
                },
            });
            return { success: true };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'server_error', message: 'Failed to delete passkey' });
        }
    });
    server.post('/api/passkeys/register/options', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            return await (0, webauthnService_1.createRegistrationOptions)(user.id, user.email);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'server_error', message: 'Failed to create registration options' });
        }
    });
    server.post('/api/passkeys/register/verify', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            const credential = body?.credential || {};
            const attestation = body?.attestation || {};
            const registrationResponse = {
                id: credential.id,
                rawId: credential.rawId,
                type: credential.type || 'public-key',
                response: {
                    clientDataJSON: attestation.clientDataJSON,
                    attestationObject: attestation.attestationObject,
                    transports: credential.transports || [],
                },
                clientExtensionResults: {},
            };
            const result = await (0, webauthnService_1.verifyRegistration)(user.id, registrationResponse);
            if (!result.verified) {
                return reply.code(400).send({ error: 'verification_failed', message: result.message });
            }
            const prisma = (0, prisma_1.getPrismaClient)();
            const created = await prisma.webAuthnCredential.findUnique({
                where: { credentialId: credential.id },
            });
            return {
                success: true,
                passkey: {
                    id: created?.credentialId || credential.id,
                    transports: created?.transports || [],
                    signCount: Number(created?.counter || 0),
                    friendlyName: body?.friendlyName || created?.deviceType || 'Passkey',
                    createdAt: (created?.createdAt || new Date()).getTime(),
                },
            };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'server_error', message: error?.message || 'Failed to verify passkey' });
        }
    });
    server.post('/api/passkeys/authenticate/options', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            return await (0, webauthnService_1.createAuthenticationOptions)(user.id);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'server_error', message: 'Failed to create authentication options' });
        }
    });
    server.post('/api/passkeys/authenticate/verify', { preHandler: auth_1.requireAuth }, async (request, reply) => {
        try {
            const user = request.user;
            const body = request.body;
            const credential = body?.credential || {};
            const assertion = body?.assertion || {};
            const authenticationResponse = {
                id: credential.id,
                rawId: credential.rawId,
                type: credential.type || 'public-key',
                response: {
                    clientDataJSON: assertion.clientDataJSON,
                    authenticatorData: assertion.authenticatorData,
                    signature: assertion.signature,
                    userHandle: assertion.userHandle,
                },
                clientExtensionResults: {},
            };
            const result = await (0, webauthnService_1.verifyAuthentication)(user.id, authenticationResponse);
            if (!result.verified) {
                return reply.code(400).send({ error: 'verification_failed', message: result.message });
            }
            return { success: true };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'server_error', message: error?.message || 'Failed to authenticate passkey' });
        }
    });
}
