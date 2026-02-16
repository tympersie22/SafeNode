"use strict";
/**
 * Vault Controller
 * Handles vault CRUD operations with validation and adapter integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestVault = getLatestVault;
exports.saveVault = saveVault;
exports.saveVaultAlias = saveVaultAlias;
const adapters_1 = require("../adapters");
const vaultSchema_1 = require("../validation/vaultSchema");
/**
 * GET /api/vault/latest
 * Retrieves the latest vault version
 */
async function getLatestVault(request, reply) {
    try {
        // Validate query parameters
        const query = (0, vaultSchema_1.validateVaultLatestQuery)(request.query);
        const since = query.since;
        // Read vault from adapter
        const vault = await adapters_1.adapter.readVault();
        // Check if vault exists
        if (!vault || !vault.encryptedVault || !vault.iv) {
            return { exists: false };
        }
        // If since is provided and vault is up to date, return upToDate response
        if (since !== undefined && since >= vault.version) {
            return {
                upToDate: true,
                version: vault.version
            };
        }
        // Return vault data
        return vault;
    }
    catch (error) {
        request.log.error(error);
        // Handle validation errors
        if (error.name === 'ZodError') {
            return reply.code(400).send({
                error: 'validation_error',
                message: 'Invalid query parameters',
                details: error.errors
            });
        }
        return reply.code(500).send({
            error: error?.message || 'server_error',
            message: 'Failed to fetch vault'
        });
    }
}
/**
 * POST /api/vault
 * Saves a vault
 */
async function saveVault(request, reply) {
    try {
        // Validate request body
        const body = (0, vaultSchema_1.validateVaultSaveRequest)(request.body);
        // Validate required fields
        if (!body.encryptedVault || body.encryptedVault.trim().length === 0) {
            return reply.code(400).send({
                error: 'invalid_payload',
                message: 'encryptedVault is required and cannot be empty'
            });
        }
        if (!body.iv || body.iv.trim().length === 0) {
            return reply.code(400).send({
                error: 'invalid_payload',
                message: 'iv is required and cannot be empty'
            });
        }
        // Create stored vault object
        const storedVault = {
            id: 'default',
            encryptedVault: body.encryptedVault,
            iv: body.iv,
            salt: body.salt,
            version: body.version || Date.now(),
            lastModified: Date.now(),
            isOffline: false
        };
        // Write to adapter (adapter handles encryption at rest if enabled)
        await adapters_1.adapter.writeVault(storedVault);
        return {
            ok: true,
            version: storedVault.version
        };
    }
    catch (error) {
        request.log.error(error);
        // Handle validation errors
        if (error.name === 'ZodError') {
            return reply.code(400).send({
                error: 'validation_error',
                message: 'Invalid vault payload',
                details: error.errors
            });
        }
        return reply.code(500).send({
            error: error?.message || 'server_error',
            message: 'Failed to save vault'
        });
    }
}
/**
 * POST /api/vault/save
 * Alias for POST /api/vault
 */
async function saveVaultAlias(request, reply) {
    return saveVault(request, reply);
}
