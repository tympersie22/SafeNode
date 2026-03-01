import { FastifyReply, FastifyRequest } from 'fastify'
import { getPrismaClient } from '../db/prisma'
import { findUserById } from '../services/userService'
import { checkSubscriptionLimits } from '../services/stripeService'

type EffectivePlan = 'free' | 'individual' | 'family' | 'teams'

const PLAN_NAMES: Record<EffectivePlan, string> = {
  free: 'Free',
  individual: 'Personal',
  family: 'Family',
  teams: 'Teams'
}

const NEXT_PLAN: Record<EffectivePlan, EffectivePlan | null> = {
  free: 'individual',
  individual: 'family',
  family: 'teams',
  teams: null
}

async function resolveEffectivePlan(userId: string, subscriptionTier: string): Promise<EffectivePlan> {
  const prisma = getPrismaClient()
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: ['active', 'trialing', 'past_due']
      }
    },
    orderBy: [{ currentPeriodEnd: 'desc' }, { createdAt: 'desc' }]
  })

  const priceId = activeSubscription?.stripePriceId || ''

  const byPlan: Array<[EffectivePlan, string[]]> = [
    ['individual', [process.env.PADDLE_PRICE_INDIVIDUAL_MONTHLY || '', process.env.PADDLE_PRICE_INDIVIDUAL_ANNUAL || '', process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY || '', process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL || '', process.env.STRIPE_PRICE_INDIVIDUAL || ''].filter(Boolean)],
    ['family', [process.env.PADDLE_PRICE_FAMILY_MONTHLY || '', process.env.PADDLE_PRICE_FAMILY_ANNUAL || '', process.env.STRIPE_PRICE_FAMILY_MONTHLY || '', process.env.STRIPE_PRICE_FAMILY_ANNUAL || '', process.env.STRIPE_PRICE_FAMILY || ''].filter(Boolean)],
    ['teams', [process.env.PADDLE_PRICE_TEAMS_MONTHLY || '', process.env.PADDLE_PRICE_TEAMS_ANNUAL || '', process.env.STRIPE_PRICE_TEAMS_MONTHLY || '', process.env.STRIPE_PRICE_TEAMS_ANNUAL || '', process.env.STRIPE_PRICE_TEAMS || ''].filter(Boolean)]
  ]

  for (const [plan, ids] of byPlan) {
    if (ids.includes(priceId)) {
      return plan
    }
  }

  if (subscriptionTier === 'enterprise') return 'teams'
  if (subscriptionTier === 'pro') return 'individual'
  return 'free'
}

function buildDeviceAccessMessage(plan: EffectivePlan, current: number, limit: number): { message: string; recommendedPlan: EffectivePlan | null } {
  const recommendedPlan = NEXT_PLAN[plan]

  if (!recommendedPlan) {
    return {
      message: `${PLAN_NAMES[plan]} allows up to ${limit} registered devices and your account is already at ${current}/${limit}. Remove an existing device to access the vault from this device.`,
      recommendedPlan
    }
  }

  return {
    message: `${PLAN_NAMES[plan]} allows up to ${limit} registered device${limit === 1 ? '' : 's'}. This device is not registered and your account is already at ${current}/${limit}. Upgrade to ${PLAN_NAMES[recommendedPlan]} to increase your device limit.`,
    recommendedPlan
  }
}

export async function requireRegisteredDevice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = (request as any).user
  const deviceId = (request.headers['x-device-id'] || request.headers['X-Device-Id']) as string | undefined

  if (!user?.id) {
    return reply.code(401).send({
      error: 'unauthorized',
      code: 'MISSING_USER',
      message: 'Authentication required'
    })
  }

  if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
    return reply.code(403).send({
      error: 'device_access_denied',
      code: 'MISSING_DEVICE_ID',
      message: 'This vault request did not include a registered device identifier. Sign in again on this device and retry.'
    })
  }

  const prisma = getPrismaClient()
  const activeDevice = await prisma.device.findUnique({
    where: {
      userId_deviceId: {
        userId: user.id,
        deviceId: deviceId.trim()
      }
    }
  })

  if (activeDevice?.isActive) {
    await prisma.device.update({
      where: { id: activeDevice.id },
      data: {
        lastSeen: new Date(),
        isActive: true
      }
    }).catch(() => undefined)
    return
  }

  const userRecord = await findUserById(user.id)
  const deviceLimit = await checkSubscriptionLimits(user.id, 'devices')
  const currentPlan = await resolveEffectivePlan(user.id, userRecord?.subscriptionTier || 'free')
  const guidance = buildDeviceAccessMessage(currentPlan, deviceLimit.current, deviceLimit.limit)

  return reply.code(403).send({
    error: 'device_access_denied',
    code: activeDevice ? 'DEVICE_INACTIVE' : 'DEVICE_NOT_REGISTERED',
    message: guidance.message,
    currentPlan,
    currentPlanName: PLAN_NAMES[currentPlan],
    recommendedPlan: guidance.recommendedPlan,
    recommendedPlanName: guidance.recommendedPlan ? PLAN_NAMES[guidance.recommendedPlan] : null,
    current: deviceLimit.current,
    limit: deviceLimit.limit
  })
}
