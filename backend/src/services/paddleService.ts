import { createHmac, timingSafeEqual } from 'crypto'
import { getPrismaClient } from '../db/prisma'
import { updateUser } from './userService'
import { createAuditLog } from './auditLogService'

type PaddlePlan = 'individual' | 'family' | 'teams'

type PaddleWebhookEvent = {
  event_id?: string
  event_type: string
  occurred_at?: string
  data?: any
}

const PADDLE_PLAN_PRICE_IDS: Record<PaddlePlan, string[]> = {
  individual: [
    process.env.PADDLE_PRICE_INDIVIDUAL_MONTHLY || '',
    process.env.PADDLE_PRICE_INDIVIDUAL_ANNUAL || ''
  ].filter(Boolean),
  family: [
    process.env.PADDLE_PRICE_FAMILY_MONTHLY || '',
    process.env.PADDLE_PRICE_FAMILY_ANNUAL || ''
  ].filter(Boolean),
  teams: [
    process.env.PADDLE_PRICE_TEAMS_MONTHLY || '',
    process.env.PADDLE_PRICE_TEAMS_ANNUAL || ''
  ].filter(Boolean)
}

function parsePaddleSignatureHeader(header: string): { timestamp: string; signatures: string[] } {
  const parts = header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  let timestamp = ''
  const signatures: string[] = []

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (!key || !value) continue

    if (key === 'ts') timestamp = value
    if (key === 'h1') signatures.push(value)
  }

  return { timestamp, signatures }
}

function safeCompareHex(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, 'hex')
    const bBuf = Buffer.from(b, 'hex')

    if (aBuf.length !== bBuf.length) return false
    return timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

export function verifyPaddleSignature(rawBody: Buffer, header: string, secret: string): boolean {
  const { timestamp, signatures } = parsePaddleSignatureHeader(header)

  if (!timestamp || signatures.length === 0) {
    return false
  }

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) {
    return false
  }

  // Allow up to 5 minutes clock skew to mitigate replay attacks without rejecting valid events.
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - ts) > 300) {
    return false
  }

  const signedPayload = `${timestamp}:${rawBody.toString('utf8')}`
  const computed = createHmac('sha256', secret).update(signedPayload).digest('hex')

  return signatures.some((signature) => safeCompareHex(signature, computed))
}

function resolvePlanFromPriceId(priceId?: string): PaddlePlan | null {
  if (!priceId) return null

  for (const [plan, ids] of Object.entries(PADDLE_PLAN_PRICE_IDS) as [PaddlePlan, string[]][]) {
    if (ids.includes(priceId)) return plan
  }

  return null
}

function mapPlanToTier(plan: PaddlePlan | null): 'free' | 'pro' | 'enterprise' {
  if (!plan) return 'free'
  if (plan === 'teams') return 'enterprise'
  return 'pro'
}

function normalizeSubscriptionStatus(status?: string): 'active' | 'cancelled' | 'past_due' | 'trialing' {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'paused':
    case 'canceled':
      return 'cancelled'
    default:
      return 'past_due'
  }
}

function extractUserId(data: any): string | null {
  const customData = data?.custom_data
  if (!customData || typeof customData !== 'object') {
    return null
  }

  const candidates = [
    customData.userId,
    customData.user_id,
    customData.externalUserId,
    customData.external_user_id
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return null
}

function getFirstPriceId(data: any): string {
  const firstItem = data?.items?.[0]
  if (!firstItem) return 'paddle_unknown_price'

  if (typeof firstItem.price_id === 'string' && firstItem.price_id) {
    return firstItem.price_id
  }

  if (typeof firstItem?.price?.id === 'string' && firstItem.price.id) {
    return firstItem.price.id
  }

  return 'paddle_unknown_price'
}

function toDate(input: string | undefined, fallback: Date): Date {
  if (!input) return fallback
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return fallback
  return d
}

export async function handlePaddleWebhookEvent(event: PaddleWebhookEvent): Promise<void> {
  if (!event?.event_type?.startsWith('subscription.')) {
    return
  }

  const prisma = getPrismaClient()
  const data = event.data || {}
  const subscriptionId: string | undefined = data.id

  if (!subscriptionId || typeof subscriptionId !== 'string') {
    return
  }

  const status = normalizeSubscriptionStatus(data.status)
  const priceId = getFirstPriceId(data)
  const plan = resolvePlanFromPriceId(priceId)
  const tier = mapPlanToTier(plan)
  const occurredAt = toDate(event.occurred_at, new Date())
  const periodStart = toDate(data?.current_billing_period?.starts_at || data?.started_at, occurredAt)
  const periodEnd = toDate(data?.current_billing_period?.ends_at || data?.next_billed_at, new Date(occurredAt.getTime() + 30 * 24 * 60 * 60 * 1000))
  const cancelAtPeriodEnd = Boolean(data?.scheduled_change?.action === 'cancel')

  let userId = extractUserId(data)

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId }
  })

  if (!userId && existing) {
    userId = existing.userId
  }

  if (!userId) {
    return
  }

  if (existing) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        stripePriceId: priceId,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd
      }
    })
  } else {
    await prisma.subscription.create({
      data: {
        userId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd
      }
    })
  }

  if (status === 'cancelled') {
    await updateUser(userId, {
      subscriptionTier: 'free',
      subscriptionStatus: 'cancelled'
    } as any)
  } else {
    await updateUser(userId, {
      subscriptionTier: tier,
      subscriptionStatus: status
    } as any)
  }

  await createAuditLog({
    userId,
    action: status === 'cancelled' ? 'subscription_cancelled' : 'subscription_created',
    resourceType: 'subscription',
    resourceId: subscriptionId,
    metadata: {
      provider: 'paddle',
      eventType: event.event_type,
      eventId: event.event_id,
      priceId,
      plan,
      status
    }
  })
}
