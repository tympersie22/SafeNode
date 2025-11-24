/**
 * Vault Controller
 * Handles vault CRUD operations with validation and adapter integration
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { adapter } from '../adapters'
import {
  validateVaultSaveRequest,
  validateVaultLatestQuery,
  StoredVault
} from '../validation/vaultSchema'

/**
 * GET /api/vault/latest
 * Retrieves the latest vault version
 */
export async function getLatestVault(
  request: FastifyRequest<{ Querystring: { since?: string } }>,
  reply: FastifyReply
) {
  try {
    // Validate query parameters
    const query = validateVaultLatestQuery(request.query)
    const since = query.since

    // Read vault from adapter
    const vault = await adapter.readVault()

    // Check if vault exists
    if (!vault || !vault.encryptedVault || !vault.iv) {
      return { exists: false }
    }

    // If since is provided and vault is up to date, return upToDate response
    if (since !== undefined && since >= vault.version) {
      return {
        upToDate: true,
        version: vault.version
      }
    }

    // Return vault data
    return vault
  } catch (error: any) {
    request.log.error(error)
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'Invalid query parameters',
        details: error.errors
      })
    }
    
    return reply.code(500).send({
      error: error?.message || 'server_error',
      message: 'Failed to fetch vault'
    })
  }
}

/**
 * POST /api/vault
 * Saves a vault
 */
export async function saveVault(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  try {
    // Validate request body
    const body = validateVaultSaveRequest(request.body)

    // Validate required fields
    if (!body.encryptedVault || body.encryptedVault.trim().length === 0) {
      return reply.code(400).send({
        error: 'invalid_payload',
        message: 'encryptedVault is required and cannot be empty'
      })
    }

    if (!body.iv || body.iv.trim().length === 0) {
      return reply.code(400).send({
        error: 'invalid_payload',
        message: 'iv is required and cannot be empty'
      })
    }

    // Create stored vault object
    const storedVault: StoredVault = {
      id: 'default',
      encryptedVault: body.encryptedVault,
      iv: body.iv,
      salt: body.salt,
      version: body.version || Date.now(),
      lastModified: Date.now(),
      isOffline: false
    }

    // Write to adapter (adapter handles encryption at rest if enabled)
    await adapter.writeVault(storedVault)

    return {
      ok: true,
      version: storedVault.version
    }
  } catch (error: any) {
    request.log.error(error)
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        error: 'validation_error',
        message: 'Invalid vault payload',
        details: error.errors
      })
    }
    
    return reply.code(500).send({
      error: error?.message || 'server_error',
      message: 'Failed to save vault'
    })
  }
}

/**
 * POST /api/vault/save
 * Alias for POST /api/vault
 */
export async function saveVaultAlias(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  return saveVault(request, reply)
}

