import { FastifyInstance } from 'fastify'
import { randomBytes } from 'crypto'
import { requireAuth } from '../middleware/auth'
import { getPrismaClient } from '../db/prisma'
import { createDeviceSession, getRequestAuditContext, getRequestDeviceId } from '../services/deviceSessionService'
import { createUser, deleteUser, findUserByEmail, updateUser } from '../services/userService'
import { issueToken } from '../middleware/auth'
import {
  createAuthenticationOptions,
  createAuthenticationOptionsForCredentialIds,
  createAuthenticationOptionsForCredentials,
  createRegistrationOptions,
  createRegistrationOptionsForIdentity,
  verifyDetachedAuthentication,
  verifyDetachedRegistration,
  verifyAuthentication,
  verifyRegistration,
} from '../services/webauthnService'

const pendingPasskeySignups = new Map<string, {
  email: string
  displayName?: string
  challenge: string
  provisionalUserId: string
  expiresAt: number
}>()

const pendingPasskeyLogins = new Map<string, {
  email: string
  userId: string
  challenge: string
  expiresAt: number
}>()

function createFlowId() {
  return randomBytes(24).toString('hex')
}

function createInternalPassword() {
  return randomBytes(32).toString('base64url')
}

function serializeAuthUser(user: any) {
  const createdAt = user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt
  const lastLoginAt = user.lastLoginAt instanceof Date ? user.lastLoginAt.getTime() : user.lastLoginAt
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerified: Boolean(user.emailVerified),
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    biometricEnabled: Boolean(user.biometricEnabled),
    hasVault: Boolean(user.vaultEncrypted && user.vaultIV && user.vaultSalt),
    vaultAccessMode: user.vaultAccessMode === 'wrapped_key' ? 'wrapped_key' : 'passphrase',
    recoveryKitConfigured: Boolean(
      user.recoveryWrappedVaultKey &&
      user.recoveryWrappedVaultKeyIV &&
      user.recoverySalt &&
      user.recoveryKitCreatedAt
    ),
    createdAt,
    lastLoginAt,
  }
}

function toRegistrationResponse(body: any) {
  const credential = body?.credential || {}
  const attestation = body?.attestation || {}

  return {
    id: credential.id,
    rawId: credential.rawId,
    type: credential.type || 'public-key',
    response: {
      clientDataJSON: attestation.clientDataJSON,
      attestationObject: attestation.attestationObject,
      transports: credential.transports || [],
    },
    clientExtensionResults: {},
  }
}

function toAuthenticationResponse(body: any) {
  const credential = body?.credential || {}
  const assertion = body?.assertion || {}

  return {
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
  }
}

export async function registerPasskeyRoutes(server: FastifyInstance) {
  const parseVaultWrapBody = (body: any) => {
    const prfSalt = typeof body?.prfSalt === 'string' ? body.prfSalt.trim() : ''
    const prfWrappedVaultKey = typeof body?.prfWrappedVaultKey === 'string' ? body.prfWrappedVaultKey.trim() : ''
    const prfWrappedVaultKeyIV = typeof body?.prfWrappedVaultKeyIV === 'string' ? body.prfWrappedVaultKeyIV.trim() : ''

    if (!prfSalt || !prfWrappedVaultKey || !prfWrappedVaultKeyIV) {
      throw new Error('PRF vault-wrapping payload is incomplete.')
    }

    return {
      prfSalt,
      prfWrappedVaultKey,
      prfWrappedVaultKeyIV,
    }
  }

  server.post('/api/passkeys/signup/options', async (request, reply) => {
    try {
      const body = request.body as { email?: string; displayName?: string }
      const email = body?.email?.toLowerCase().trim()
      const displayName = body?.displayName?.trim()

      if (!email || !email.includes('@')) {
        return reply.code(400).send({ error: 'validation_error', message: 'A valid email address is required.' })
      }

      const existing = await findUserByEmail(email)
      if (existing) {
        return reply.code(409).send({
          error: 'email_exists',
          message: 'An account with this email already exists. Use passkey sign-in or legacy sign-in instead.',
        })
      }

      const flowId = createFlowId()
      const provisionalUserId = `passkey-signup-${flowId}`
      const options = await createRegistrationOptionsForIdentity(provisionalUserId, email)
      pendingPasskeySignups.set(flowId, {
        email,
        displayName: displayName || undefined,
        challenge: options.challenge,
        provisionalUserId,
        expiresAt: Date.now() + 5 * 60 * 1000,
      })

      return { flowId, options }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to begin passkey sign-up' })
    }
  })

  server.post('/api/passkeys/signup/verify', async (request, reply) => {
    try {
      const body = request.body as any
      const flowId = typeof body?.flowId === 'string' ? body.flowId : ''
      const pending = pendingPasskeySignups.get(flowId)

      if (!pending || pending.expiresAt < Date.now()) {
        pendingPasskeySignups.delete(flowId)
        return reply.code(400).send({ error: 'challenge_expired', message: 'Passkey sign-up expired. Please try again.' })
      }

      const existing = await findUserByEmail(pending.email)
      if (existing) {
        pendingPasskeySignups.delete(flowId)
        return reply.code(409).send({
          error: 'email_exists',
          message: 'An account with this email already exists. Use passkey sign-in or legacy sign-in instead.',
        })
      }

      const user = await createUser({
        email: pending.email,
        password: createInternalPassword(),
        displayName: pending.displayName,
      })

      await updateUser(user.id, { emailVerified: true })
      let result
      try {
        result = await verifyDetachedRegistration(user.id, pending.challenge, toRegistrationResponse(body))
      } catch (verificationError) {
        await deleteUser(user.id).catch(() => undefined)
        throw verificationError
      }
      if (!result.verified) {
        await deleteUser(user.id).catch(() => undefined)
        pendingPasskeySignups.delete(flowId)
        return reply.code(400).send({ error: 'verification_failed', message: result.message })
      }

      const verifiedUser = await findUserByEmail(pending.email)
      if (!verifiedUser) {
        pendingPasskeySignups.delete(flowId)
        return reply.code(500).send({ error: 'server_error', message: 'Failed to finish passkey sign-up.' })
      }

      const session = await createDeviceSession({
        userId: verifiedUser.id,
        deviceId: getRequestDeviceId(request),
        ...getRequestAuditContext(request),
      })

      const token = issueToken({
        id: verifiedUser.id,
        email: verifiedUser.email,
        tokenVersion: (verifiedUser as any).tokenVersion || 1,
        sessionId: session.id,
      })

      pendingPasskeySignups.delete(flowId)

      return {
        success: true,
        token,
        userId: verifiedUser.id,
        user: serializeAuthUser(verifiedUser),
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: error?.message || 'Failed to finish passkey sign-up' })
    }
  })

  server.post('/api/passkeys/login/options', async (request, reply) => {
    try {
      const body = request.body as { email?: string }
      const email = body?.email?.toLowerCase().trim()
      if (!email || !email.includes('@')) {
        return reply.code(400).send({ error: 'validation_error', message: 'A valid email address is required.' })
      }

      const user = await findUserByEmail(email)
      if (!user) {
        return reply.code(404).send({ error: 'user_not_found', message: 'No account was found for this email.' })
      }

      const prisma = getPrismaClient()
      const credentials = await prisma.webAuthnCredential.findMany({
        where: { userId: user.id },
        select: { credentialId: true, transports: true },
      })

      if (credentials.length === 0) {
        return reply.code(400).send({
          error: 'no_passkeys',
          message: 'This account does not have a registered passkey yet. Use legacy sign-in to add one first.',
        })
      }

      const options = await createAuthenticationOptionsForCredentials(credentials)
      const flowId = createFlowId()
      pendingPasskeyLogins.set(flowId, {
        email,
        userId: user.id,
        challenge: options.challenge,
        expiresAt: Date.now() + 5 * 60 * 1000,
      })

      return { flowId, options }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to begin passkey sign-in' })
    }
  })

  server.post('/api/passkeys/login/verify', async (request, reply) => {
    try {
      const body = request.body as any
      const flowId = typeof body?.flowId === 'string' ? body.flowId : ''
      const pending = pendingPasskeyLogins.get(flowId)

      if (!pending || pending.expiresAt < Date.now()) {
        pendingPasskeyLogins.delete(flowId)
        return reply.code(400).send({ error: 'challenge_expired', message: 'Passkey sign-in expired. Please try again.' })
      }

      const prisma = getPrismaClient()
      const credentialId = body?.credential?.id
      const credential = await prisma.webAuthnCredential.findUnique({
        where: { credentialId },
      })

      if (!credential || credential.userId !== pending.userId) {
        pendingPasskeyLogins.delete(flowId)
        return reply.code(400).send({ error: 'verification_failed', message: 'Credential not found for this account.' })
      }

      const result = await verifyDetachedAuthentication(credential, pending.challenge, toAuthenticationResponse(body))
      if (!result.verified) {
        pendingPasskeyLogins.delete(flowId)
        return reply.code(400).send({ error: 'verification_failed', message: result.message })
      }

      const user = await findUserByEmail(pending.email)
      if (!user) {
        pendingPasskeyLogins.delete(flowId)
        return reply.code(401).send({ error: 'user_not_found', message: 'This account is no longer available.' })
      }

      const session = await createDeviceSession({
        userId: user.id,
        deviceId: getRequestDeviceId(request),
        ...getRequestAuditContext(request),
      })

      const token = issueToken({
        id: user.id,
        email: user.email,
        tokenVersion: (user as any).tokenVersion || 1,
        sessionId: session.id,
      })

      pendingPasskeyLogins.delete(flowId)

      return {
        success: true,
        token,
        userId: user.id,
        user: serializeAuthUser(user),
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: error?.message || 'Failed to finish passkey sign-in' })
    }
  })

  server.get('/api/passkeys', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const prisma = getPrismaClient()
      const creds = await prisma.webAuthnCredential.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      return {
        passkeys: creds.map((c) => ({
          id: c.credentialId,
          transports: c.transports,
          signCount: Number(c.counter),
          friendlyName: c.deviceType || 'Passkey',
          prfReady: Boolean(c.prfSalt && c.prfWrappedVaultKey && c.prfWrappedVaultKeyIV),
          createdAt: c.createdAt.getTime(),
        })),
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to load passkeys' })
    }
  })

  server.delete('/api/passkeys/:id', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { id } = request.params as { id: string }
      const prisma = getPrismaClient()

      await prisma.webAuthnCredential.deleteMany({
        where: {
          userId: user.id,
          credentialId: id,
        },
      })

      return { success: true }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to delete passkey' })
    }
  })

  server.post('/api/passkeys/register/options', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      return await createRegistrationOptions(user.id, user.email)
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to create registration options' })
    }
  })

  server.post('/api/passkeys/register/verify', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any
      const registrationResponse = toRegistrationResponse(body)
      const result = await verifyRegistration(user.id, registrationResponse)
      if (!result.verified) {
        return reply.code(400).send({ error: 'verification_failed', message: result.message })
      }

      const prisma = getPrismaClient()
      const created = await prisma.webAuthnCredential.findUnique({
        where: { credentialId: registrationResponse.id },
      })

      return {
        success: true,
        passkey: {
          id: created?.credentialId || registrationResponse.id,
          transports: created?.transports || [],
          signCount: Number(created?.counter || 0),
          friendlyName: (body?.friendlyName as string) || created?.deviceType || 'Passkey',
          prfReady: Boolean(created?.prfSalt && created?.prfWrappedVaultKey && created?.prfWrappedVaultKeyIV),
          createdAt: (created?.createdAt || new Date()).getTime(),
        },
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: error?.message || 'Failed to verify passkey' })
    }
  })

  server.post('/api/passkeys/authenticate/options', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = (request.body as { credentialIds?: string[] } | undefined) ?? undefined
      const credentialIds = Array.isArray(body?.credentialIds)
        ? body!.credentialIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : []

      if (credentialIds.length > 0) {
        return await createAuthenticationOptionsForCredentialIds(user.id, credentialIds)
      }

      return await createAuthenticationOptions(user.id)
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to create authentication options' })
    }
  })

  server.post('/api/passkeys/authenticate/verify', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any
      const authenticationResponse = toAuthenticationResponse(body)
      const result = await verifyAuthentication(user.id, authenticationResponse)
      if (!result.verified) {
        return reply.code(400).send({ error: 'verification_failed', message: result.message })
      }

      return { success: true }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: error?.message || 'Failed to authenticate passkey' })
    }
  })

  server.get('/api/passkeys/vault-unlock', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const prisma = getPrismaClient()
      const creds = await prisma.webAuthnCredential.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      return {
        passkeys: creds.map((credential) => ({
          credentialId: credential.credentialId,
          friendlyName: credential.deviceType || 'Passkey',
          createdAt: credential.createdAt.getTime(),
          prfReady: Boolean(credential.prfSalt && credential.prfWrappedVaultKey && credential.prfWrappedVaultKeyIV),
          prfSalt: credential.prfSalt,
          prfWrappedVaultKey: credential.prfWrappedVaultKey,
          prfWrappedVaultKeyIV: credential.prfWrappedVaultKeyIV,
        })),
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({ error: 'server_error', message: 'Failed to load passkey vault wrapping data' })
    }
  })

  server.post('/api/passkeys/:id/vault-unlock', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const user = (request as any).user
      const { id } = request.params as { id: string }
      const { prfSalt, prfWrappedVaultKey, prfWrappedVaultKeyIV } = parseVaultWrapBody(request.body)
      const prisma = getPrismaClient()

      const updated = await prisma.webAuthnCredential.updateMany({
        where: {
          userId: user.id,
          credentialId: id,
        },
        data: {
          prfSalt,
          prfWrappedVaultKey,
          prfWrappedVaultKeyIV,
        },
      })

      if (updated.count === 0) {
        return reply.code(404).send({ error: 'passkey_not_found', message: 'Passkey not found' })
      }

      return { success: true }
    } catch (error: any) {
      request.log.error(error)
      if (error?.message === 'PRF vault-wrapping payload is incomplete.') {
        return reply.code(400).send({ error: 'validation_error', message: error.message })
      }
      return reply.code(500).send({ error: 'server_error', message: error?.message || 'Failed to save passkey vault wrapping data' })
    }
  })
}
