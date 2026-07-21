import { createHash, randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import Fastify from 'fastify'
import { issueToken, verifyToken } from '../../src/middleware/auth'
import { registerDesktopAuthRoutes } from '../../src/routes/desktopAuth'
import { createDeviceSession } from '../../src/services/deviceSessionService'
import { createUser } from '../../src/services/userService'

const randomValue = () => randomBytes(32).toString('base64url')
const challenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url')

describe('desktop PKCE authorization', () => {
  let server: any

  beforeAll(async () => {
    server = Fastify({ logger: false })
    await registerDesktopAuthRoutes(server)
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it('requires browser authentication and atomically exchanges a one-time PKCE code', async () => {
    const user = await createUser({
      email: `desktop-${Date.now()}@example.com`,
      password: 'Password123!',
      displayName: 'Desktop Test',
    })
    const browserSession = await createDeviceSession({ userId: user.id, deviceId: 'browser-test' })
    const browserToken = issueToken({
      id: user.id,
      email: user.email,
      tokenVersion: (user as any).tokenVersion || 1,
      sessionId: browserSession.id,
    })
    const state = randomValue()
    const verifier = randomValue()

    const start = await server.inject({
      method: 'POST',
      url: '/api/desktop-auth/start',
      payload: { state, codeChallenge: challenge(verifier) },
    })
    expect(start.statusCode).toBe(200)
    const started = JSON.parse(start.body)
    expect(started.browserUrl).toContain('/auth/desktop?')

    const unauthenticatedApproval = await server.inject({
      method: 'POST',
      url: '/api/desktop-auth/approve',
      payload: { flowId: started.flowId, state },
    })
    expect(unauthenticatedApproval.statusCode).toBe(401)

    const approval = await server.inject({
      method: 'POST',
      url: '/api/desktop-auth/approve',
      headers: { Authorization: `Bearer ${browserToken}` },
      payload: { flowId: started.flowId, state },
    })
    expect(approval.statusCode).toBe(200)
    const callback = new URL(JSON.parse(approval.body).redirectUrl)
    const code = callback.searchParams.get('code')
    expect(callback.protocol).toBe('safenode:')
    expect(code).toHaveLength(43)

    const wrongVerifier = await server.inject({
      method: 'POST',
      url: '/api/desktop-auth/exchange',
      headers: { 'x-device-id': 'desktop-test' },
      payload: { flowId: started.flowId, state, code, codeVerifier: randomValue() },
    })
    expect(wrongVerifier.statusCode).toBe(400)

    const exchange = await server.inject({
      method: 'POST',
      url: '/api/desktop-auth/exchange',
      headers: { 'x-device-id': 'desktop-test' },
      payload: { flowId: started.flowId, state, code, codeVerifier: verifier },
    })
    expect(exchange.statusCode).toBe(200)
    const exchanged = JSON.parse(exchange.body)
    expect(exchanged.user.id).toBe(user.id)
    expect(verifyToken(exchanged.token)?.sessionId).toBeTruthy()

    const replay = await server.inject({
      method: 'POST',
      url: '/api/desktop-auth/exchange',
      payload: { flowId: started.flowId, state, code, codeVerifier: verifier },
    })
    expect(replay.statusCode).toBe(400)
    expect(JSON.parse(replay.body).error).toBe('invalid_grant')
  })
})
