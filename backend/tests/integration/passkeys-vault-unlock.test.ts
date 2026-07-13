import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import Fastify from 'fastify'
import { registerPasskeyRoutes } from '../../src/routes/passkeys'
import { createDeviceSession } from '../../src/services/deviceSessionService'
import { createUser } from '../../src/services/userService'
import { issueToken } from '../../src/middleware/auth'

describe('Passkey vault-unlock routes', () => {
  let server: any

  beforeAll(async () => {
    server = Fastify({ logger: false })
    await registerPasskeyRoutes(server)
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it('returns 404 when saving a PRF wrap for a missing or non-owned passkey', async () => {
    const email = `passkey-wrap-${Date.now()}@example.com`
    const user = await createUser({
      email,
      password: 'Password123!',
      displayName: 'Passkey Wrap Test',
    })

    const session = await createDeviceSession({
      userId: user.id,
      deviceId: `device-${Date.now()}`,
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    })

    const token = issueToken({
      id: user.id,
      email: user.email,
      tokenVersion: (user as any).tokenVersion || 1,
      sessionId: session.id,
    })

    const response = await server.inject({
      method: 'POST',
      url: '/api/passkeys/missing-credential/vault-unlock',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        prfSalt: 'salt',
        prfWrappedVaultKey: 'wrapped-key',
        prfWrappedVaultKeyIV: 'wrapped-iv',
      },
    })

    expect(response.statusCode).toBe(404)
    expect(JSON.parse(response.body)).toEqual({
      error: 'passkey_not_found',
      message: 'Passkey not found',
    })
  })
})
