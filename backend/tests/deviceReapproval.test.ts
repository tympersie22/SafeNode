/**
 * Device re-approval flow
 * Verifies the emailed one-time token clears the requiresReapproval flag and is
 * single-use + expiry-checked. Uses the real test database (see tests/setup.ts).
 */

import { getPrismaClient } from '../src/db/prisma'
import {
  createDeviceReapprovalToken,
  confirmDeviceReapproval
} from '../src/services/deviceReapprovalService'
import { emailService } from '../src/services/emailService'

const prisma = getPrismaClient()

async function makeUserWithRemovedDevice() {
  const user = await prisma.user.create({
    data: {
      email: `reapproval-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: 'x',
      vaultSalt: 'salt'
    }
  })
  const device = await prisma.device.create({
    data: {
      userId: user.id,
      deviceId: `dev-${Math.random().toString(36).slice(2)}`,
      name: 'Test Browser',
      platform: 'web',
      isActive: false,
      requiresReapproval: true
    }
  })
  return { user, device }
}

async function issueToken(params: {
  userId: string
  deviceRowId: string
  email: string
  displayName?: string | null
  deviceName?: string | null
}): Promise<string> {
  let deliveredToken = ''
  jest.spyOn(emailService, 'sendDeviceReapprovalEmail').mockImplementation(
    async (_email, token) => {
      deliveredToken = token
    }
  )

  await createDeviceReapprovalToken(params)
  expect(deliveredToken).not.toBe('')
  return deliveredToken
}

describe('device re-approval flow', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('issues a token and clears requiresReapproval on confirm', async () => {
    const { user, device } = await makeUserWithRemovedDevice()

    const token = await issueToken({
      userId: user.id,
      deviceRowId: device.id,
      email: user.email,
      displayName: null,
      deviceName: device.name
    })

    const tokenRow = await prisma.deviceReapprovalToken.findFirst({
      where: { userId: user.id, deviceId: device.id }
    })
    expect(tokenRow).toBeTruthy()
    expect(tokenRow!.token).not.toBe(token)

    const result = await confirmDeviceReapproval(token)
    expect(result.success).toBe(true)

    const updated = await prisma.device.findUnique({ where: { id: device.id } })
    expect(updated?.requiresReapproval).toBe(false)
    expect(updated?.isActive).toBe(true)

    const usedToken = await prisma.deviceReapprovalToken.findUnique({ where: { id: tokenRow!.id } })
    expect(usedToken?.usedAt).toBeTruthy()
  })

  it('rejects a reused token', async () => {
    const { user, device } = await makeUserWithRemovedDevice()
    const token = await issueToken({ userId: user.id, deviceRowId: device.id, email: user.email })
    await confirmDeviceReapproval(token)

    const second = await confirmDeviceReapproval(token)
    expect(second.success).toBe(false)
    expect(second.error).toMatch(/already been used/i)
  })

  it('rejects an expired token and leaves the device removed', async () => {
    const { user, device } = await makeUserWithRemovedDevice()
    const token = await issueToken({ userId: user.id, deviceRowId: device.id, email: user.email })

    const tokenRow = await prisma.deviceReapprovalToken.findFirst({ where: { deviceId: device.id } })
    await prisma.deviceReapprovalToken.update({
      where: { id: tokenRow!.id },
      data: { expiresAt: new Date(Date.now() - 1000) }
    })

    const result = await confirmDeviceReapproval(token)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/expired/i)

    const unchanged = await prisma.device.findUnique({ where: { id: device.id } })
    expect(unchanged?.requiresReapproval).toBe(true)
  })

  it('allows only one concurrent confirmation', async () => {
    const { user, device } = await makeUserWithRemovedDevice()
    const token = await issueToken({ userId: user.id, deviceRowId: device.id, email: user.email })

    const results = await Promise.all([
      confirmDeviceReapproval(token),
      confirmDeviceReapproval(token)
    ])

    expect(results.filter(result => result.success)).toHaveLength(1)
    expect(results.filter(result => !result.success)).toHaveLength(1)
  })

  it('rejects an unknown token', async () => {
    const result = await confirmDeviceReapproval('nonexistent-token-abcdefghijklmnop')
    expect(result.success).toBe(false)
  })
})
