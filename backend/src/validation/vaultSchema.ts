/**
 * Vault Validation Schema
 * Uses Zod to validate vault payloads from the frontend
 */

import { z } from 'zod'

// Attachment schema
const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number().positive(),
  data: z.string(), // base64 encoded
  uploadedAt: z.number()
})

// Vault entry schema
const VaultEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  totpSecret: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  breachCount: z.number().int().nonnegative().nullable().optional(),
  lastBreachCheck: z.number().int().nonnegative().nullable().optional(),
  createdAt: z.number().int().nonnegative().optional(),
  updatedAt: z.number().int().nonnegative().optional()
})

// Vault metadata schema
const VaultMetadataSchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.number().int().nonnegative(),
  entryCount: z.number().int().nonnegative().optional(),
  lastSync: z.number().int().nonnegative().optional()
})

// Full vault data schema (decrypted)
export const VaultDataSchema = z.object({
  entries: z.array(VaultEntrySchema),
  metadata: VaultMetadataSchema.optional()
})

// Stored vault schema (encrypted blob)
export const StoredVaultSchema = z.object({
  id: z.string().optional().default('default'),
  encryptedVault: z.string(), // base64 encoded encrypted vault
  iv: z.string(), // base64 encoded IV
  salt: z.string().optional(), // base64 encoded salt
  version: z.number().int().positive(),
  lastModified: z.number().int().nonnegative(),
  isOffline: z.boolean().optional()
})

// Vault save request schema
export const VaultSaveRequestSchema = z.object({
  encryptedVault: z.string().min(1, 'encryptedVault cannot be empty'),
  iv: z.string().min(1, 'iv cannot be empty'),
  salt: z.string().optional(),
  version: z.number().int().positive().optional()
})

// Vault latest request query schema
export const VaultLatestQuerySchema = z.object({
  since: z.string().optional().transform((val) => {
    if (!val) return undefined
    const num = Number(val)
    return isNaN(num) ? undefined : num
  })
})

// Type exports
export type VaultEntry = z.infer<typeof VaultEntrySchema>
export type VaultData = z.infer<typeof VaultDataSchema>
export type StoredVault = z.infer<typeof StoredVaultSchema>
export type VaultSaveRequest = z.infer<typeof VaultSaveRequestSchema>
export type VaultLatestQuery = z.infer<typeof VaultLatestQuerySchema>

/**
 * Validates a vault data object (decrypted)
 * @throws {z.ZodError} if validation fails
 */
export function validateVaultData(data: unknown): VaultData {
  return VaultDataSchema.parse(data)
}

/**
 * Validates a stored vault object (encrypted)
 * @throws {z.ZodError} if validation fails
 */
export function validateStoredVault(data: unknown): StoredVault {
  return StoredVaultSchema.parse(data)
}

/**
 * Validates a vault save request
 * @throws {z.ZodError} if validation fails
 */
export function validateVaultSaveRequest(data: unknown): VaultSaveRequest {
  return VaultSaveRequestSchema.parse(data)
}

/**
 * Validates vault latest query parameters
 * @throws {z.ZodError} if validation fails
 */
export function validateVaultLatestQuery(query: unknown): VaultLatestQuery {
  return VaultLatestQuerySchema.parse(query)
}

/**
 * Validates a vault entry
 * @throws {z.ZodError} if validation fails
 */
export function validateVaultEntry(data: unknown): VaultEntry {
  return VaultEntrySchema.parse(data)
}

