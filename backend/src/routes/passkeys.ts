import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth'
import { getPrismaClient } from '../db/prisma'
import {
  createAuthenticationOptions,
  createRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from '../services/webauthnService'

export async function registerPasskeyRoutes(server: FastifyInstance) {
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
      const credential = body?.credential || {}
      const attestation = body?.attestation || {}

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
      }

      const result = await verifyRegistration(user.id, registrationResponse)
      if (!result.verified) {
        return reply.code(400).send({ error: 'verification_failed', message: result.message })
      }

      const prisma = getPrismaClient()
      const created = await prisma.webAuthnCredential.findUnique({
        where: { credentialId: credential.id },
      })

      return {
        success: true,
        passkey: {
          id: created?.credentialId || credential.id,
          transports: created?.transports || [],
          signCount: Number(created?.counter || 0),
          friendlyName: (body?.friendlyName as string) || created?.deviceType || 'Passkey',
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
      const credential = body?.credential || {}
      const assertion = body?.assertion || {}

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
      }

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
}

