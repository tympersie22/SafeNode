"use strict";
/**
 * Vault Validation Schema
 * Uses Zod to validate vault payloads from the frontend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultLatestQuerySchema = exports.VaultSaveRequestSchema = exports.StoredVaultSchema = exports.VaultDataSchema = void 0;
exports.validateVaultData = validateVaultData;
exports.validateStoredVault = validateStoredVault;
exports.validateVaultSaveRequest = validateVaultSaveRequest;
exports.validateVaultLatestQuery = validateVaultLatestQuery;
exports.validateVaultEntry = validateVaultEntry;
const zod_1 = require("zod");
// Attachment schema
const AttachmentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.string(),
    size: zod_1.z.number().positive(),
    data: zod_1.z.string(), // base64 encoded
    uploadedAt: zod_1.z.number()
});
// Vault entry schema
const VaultEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    username: zod_1.z.string().optional(),
    password: zod_1.z.string().optional(),
    url: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    notes: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    category: zod_1.z.string().optional(),
    totpSecret: zod_1.z.string().optional(),
    attachments: zod_1.z.array(AttachmentSchema).optional(),
    breachCount: zod_1.z.number().int().nonnegative().nullable().optional(),
    lastBreachCheck: zod_1.z.number().int().nonnegative().nullable().optional(),
    createdAt: zod_1.z.number().int().nonnegative().optional(),
    updatedAt: zod_1.z.number().int().nonnegative().optional()
});
// Vault metadata schema
const VaultMetadataSchema = zod_1.z.object({
    version: zod_1.z.number().int().positive(),
    updatedAt: zod_1.z.number().int().nonnegative(),
    entryCount: zod_1.z.number().int().nonnegative().optional(),
    lastSync: zod_1.z.number().int().nonnegative().optional()
});
// Full vault data schema (decrypted)
exports.VaultDataSchema = zod_1.z.object({
    entries: zod_1.z.array(VaultEntrySchema),
    metadata: VaultMetadataSchema.optional()
});
// Stored vault schema (encrypted blob)
exports.StoredVaultSchema = zod_1.z.object({
    id: zod_1.z.string().optional().default('default'),
    encryptedVault: zod_1.z.string(), // base64 encoded encrypted vault
    iv: zod_1.z.string(), // base64 encoded IV
    salt: zod_1.z.string().optional(), // base64 encoded salt
    version: zod_1.z.number().int().positive(),
    lastModified: zod_1.z.number().int().nonnegative(),
    isOffline: zod_1.z.boolean().optional()
});
// Vault save request schema
exports.VaultSaveRequestSchema = zod_1.z.object({
    encryptedVault: zod_1.z.string().min(1, 'encryptedVault cannot be empty'),
    iv: zod_1.z.string().min(1, 'iv cannot be empty'),
    salt: zod_1.z.string().optional(),
    version: zod_1.z.number().int().positive().optional()
});
// Vault latest request query schema
exports.VaultLatestQuerySchema = zod_1.z.object({
    since: zod_1.z.string().optional().transform((val) => {
        if (!val)
            return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    })
});
/**
 * Validates a vault data object (decrypted)
 * @throws {z.ZodError} if validation fails
 */
function validateVaultData(data) {
    return exports.VaultDataSchema.parse(data);
}
/**
 * Validates a stored vault object (encrypted)
 * @throws {z.ZodError} if validation fails
 */
function validateStoredVault(data) {
    return exports.StoredVaultSchema.parse(data);
}
/**
 * Validates a vault save request
 * @throws {z.ZodError} if validation fails
 */
function validateVaultSaveRequest(data) {
    return exports.VaultSaveRequestSchema.parse(data);
}
/**
 * Validates vault latest query parameters
 * @throws {z.ZodError} if validation fails
 */
function validateVaultLatestQuery(query) {
    return exports.VaultLatestQuerySchema.parse(query);
}
/**
 * Validates a vault entry
 * @throws {z.ZodError} if validation fails
 */
function validateVaultEntry(data) {
    return VaultEntrySchema.parse(data);
}
