/**
 * Stripe Service
 * Handles Stripe integration for subscriptions and billing
 */

// Stripe will be imported dynamically to avoid dependency issues
import { findUserById, updateUser } from './userService'
import { getPrismaClient } from '../db/prisma'

// Type for Stripe instance
type StripeInstance = any

/**
 * Get Stripe instance (dynamic import)
 */
async function getStripe(): Promise<StripeInstance | null> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null
  }
  
  try {
    // Dynamic import to avoid type checking issues
    // @ts-ignore - Stripe is installed but TypeScript may not resolve it
    const stripeModule = await import('stripe')
    const Stripe = stripeModule.default || stripeModule
    // @ts-ignore - Stripe constructor is valid
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
  } catch (error) {
    console.error('Failed to load Stripe:', error)
    return null
  }
}

type PaidPlan = 'individual' | 'family' | 'teams'
type ResolvedPlan = 'free' | PaidPlan

const PLAN_PRICE_IDS: Record<PaidPlan, string[]> = {
  individual: [
    process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY || '',
    process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL || '',
    process.env.STRIPE_PRICE_INDIVIDUAL || '' // backward compatibility
  ].filter(Boolean),
  family: [
    process.env.STRIPE_PRICE_FAMILY_MONTHLY || '',
    process.env.STRIPE_PRICE_FAMILY_ANNUAL || '',
    process.env.STRIPE_PRICE_FAMILY || '' // backward compatibility
  ].filter(Boolean),
  teams: [
    process.env.STRIPE_PRICE_TEAMS_MONTHLY || '',
    process.env.STRIPE_PRICE_TEAMS_ANNUAL || '',
    process.env.STRIPE_PRICE_TEAMS || '' // backward compatibility
  ].filter(Boolean)
}

const ALL_PRICE_IDS = new Set(Object.values(PLAN_PRICE_IDS).flat())

const PLAN_LIMITS: Record<ResolvedPlan, { devices: number; vaults: number; teamMembers: number; storageMB: number }> = {
  free: {
    devices: 1,
    vaults: 1,
    teamMembers: 0,
    storageMB: 100
  },
  individual: {
    devices: 5,
    vaults: 5,
    teamMembers: 0,
    storageMB: 1024
  },
  family: {
    devices: 10,
    vaults: 20,
    teamMembers: 0,
    storageMB: 5120
  },
  teams: {
    devices: 50,
    vaults: 100,
    teamMembers: 50,
    storageMB: 10240
  }
}

// Subscription limits keyed by legacy/current tier names used across the app.
export const SUBSCRIPTION_LIMITS = {
  free: PLAN_LIMITS.free,
  pro: PLAN_LIMITS.individual,
  enterprise: PLAN_LIMITS.teams,
  individual: PLAN_LIMITS.individual,
  family: PLAN_LIMITS.family,
  teams: PLAN_LIMITS.teams
}

function resolvePlanFromPriceId(priceId?: string): PaidPlan | null {
  if (!priceId) {
    return null
  }

  for (const [plan, ids] of Object.entries(PLAN_PRICE_IDS) as [PaidPlan, string[]][]) {
    if (ids.includes(priceId)) {
      return plan
    }
  }

  return null
}

function mapPlanToSubscriptionTier(plan: ResolvedPlan): 'free' | 'pro' | 'enterprise' {
  if (plan === 'free') return 'free'
  if (plan === 'teams') return 'enterprise'
  return 'pro'
}

async function resolveUserPlan(userId: string, subscriptionTier: string): Promise<ResolvedPlan> {
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

  const planFromPrice = resolvePlanFromPriceId(activeSubscription?.stripePriceId)
  if (planFromPrice) {
    return planFromPrice
  }

  if (subscriptionTier === 'enterprise') return 'teams'
  if (subscriptionTier === 'pro') return 'individual'
  return 'free'
}

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  const stripe = await getStripe()
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
  }

  if (!ALL_PRICE_IDS.has(priceId)) {
    throw new Error('Invalid Stripe price ID. Configure STRIPE_PRICE_* environment variables first.')
  }

  const user = await findUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId || undefined
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.displayName || undefined,
      metadata: {
        userId: user.id
      }
    })
    customerId = customer.id
    
    // Save customer ID to user
    await updateUser(userId, {
      stripeCustomerId: customerId
    })
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user.id
    }
  })

  if (!session.url) {
    throw new Error('Stripe checkout session was created but no URL was returned')
  }

  return {
    sessionId: session.id,
    url: session.url
  }
}

/**
 * Create Stripe customer portal session
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = await getStripe()
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  const user = await findUserById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  if (!user.stripeCustomerId) {
    throw new Error('User does not have an active subscription')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl
  })

  return {
    url: session.url
  }
}

/**
 * Handle Stripe webhook event
 */
export async function handleStripeWebhook(event: any): Promise<void> {
  const stripe = await getStripe()
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  const prisma = getPrismaClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      const userId = session.metadata?.userId

      if (!userId) {
        console.error('No userId in checkout session metadata')
        return
      }

      // Get subscription
      const subscriptionId = session.subscription as string
      if (!subscriptionId) {
        console.error('No subscription ID in checkout session')
        return
      }

      const subscription: any = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = subscription.items?.data?.[0]?.price?.id
      
      if (!priceId) {
        console.error('No price ID in subscription')
        return
      }

      const plan = resolvePlanFromPriceId(priceId) || 'individual'
      const subscriptionTier = mapPlanToSubscriptionTier(plan)

      // Update user subscription
      await updateUser(userId, {
        subscriptionTier,
        subscriptionStatus: 'active',
        stripeSubscriptionId: subscriptionId
      } as any)

      // Create subscription record
      await prisma.subscription.create({
        data: {
          userId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false
        }
      })

      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription: any = event.data.object
      
      // Find subscription in database
      const dbSubscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id }
      })

      if (!dbSubscription) {
        console.error('Subscription not found in database:', subscription.id)
        return
      }

      const updatedPriceId = subscription.items?.data?.[0]?.price?.id
      const updatedPlan = resolvePlanFromPriceId(updatedPriceId) || null
      const nextSubscriptionTier = updatedPlan ? mapPlanToSubscriptionTier(updatedPlan) : null

      // Update subscription record
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          stripePriceId: updatedPriceId || dbSubscription.stripePriceId,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false
        }
      })

      // Update user subscription status
      const user = await prisma.user.findUnique({
        where: { id: dbSubscription.userId }
      })

      if (user) {
        if (subscription.status === 'active') {
          await updateUser(user.id, {
            subscriptionStatus: 'active',
            ...(nextSubscriptionTier ? { subscriptionTier: nextSubscriptionTier } : {})
          })
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await updateUser(user.id, {
            subscriptionStatus: 'cancelled',
            subscriptionTier: 'free'
          })
        } else if (subscription.status === 'past_due') {
          await updateUser(user.id, {
            subscriptionStatus: 'past_due'
          })
        }
      }

      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      const subscriptionId = invoice.subscription as string

      if (subscriptionId) {
        const dbSubscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId }
        })

        if (dbSubscription) {
          // Update subscription status to past_due
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: { status: 'past_due' }
          })

          // Update user subscription status
          await updateUser(dbSubscription.userId, {
            subscriptionStatus: 'past_due'
          })

          console.log('Invoice payment failed for subscription:', subscriptionId)
        }
      }

      break
    }

    default:
      console.log('Unhandled Stripe webhook event:', event.type)
  }
}

/**
 * Sync user subscription from Stripe
 * Updates user's subscription tier and status based on current Stripe subscription
 */
export async function syncUserSubscriptionFromStripe(userId: string): Promise<void> {
  const user = await findUserById(userId)
  if (!user || !user.stripeSubscriptionId) {
    return
  }

  const stripe = await getStripe()
  if (!stripe) {
    return
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
    const priceId = subscription.items.data[0]?.price?.id

    const plan: ResolvedPlan = resolvePlanFromPriceId(priceId) || 'free'
    const subscriptionTier = mapPlanToSubscriptionTier(plan)

    // Update user subscription tier and status
    await updateUser(userId, {
      subscriptionTier,
      subscriptionStatus: subscription.status === 'active' ? 'active' : 
                          subscription.status === 'canceled' || subscription.status === 'unpaid' ? 'cancelled' : 'past_due'
    })
  } catch (error) {
    // If sync fails, don't throw - just log
    console.error('Failed to sync subscription from Stripe:', error)
  }
}

/**
 * Check subscription limits for a user
 */
export async function checkSubscriptionLimits(
  userId: string,
  resource: 'devices' | 'vaults' | 'teamMembers' | 'storage'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const user = await findUserById(userId)
  
  if (!user) {
    return { allowed: false, current: 0, limit: 0 }
  }

  const plan = await resolveUserPlan(userId, user.subscriptionTier)
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

  // Get current usage
  const prisma = getPrismaClient()
  let current = 0

  switch (resource) {
    case 'devices':
      current = await prisma.device.count({
        where: { userId, isActive: true }
      })
      break
    case 'vaults':
      // Count team vaults for user
      const teamIds = await prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true }
      })
      current = await prisma.teamVault.count({
        where: { teamId: { in: teamIds.map(t => t.teamId) } }
      })
      break
    case 'teamMembers':
      const teams = await prisma.teamMember.findMany({
        where: { userId, role: { in: ['owner', 'admin'] } },
        select: { teamId: true }
      })
      current = await prisma.teamMember.count({
        where: { teamId: { in: teams.map(t => t.teamId) } }
      })
      break
    case 'storage':
      // This would require calculating vault size - simplified for now
      current = 0
      break
  }

  const limit = resource === 'storage' ? limits.storageMB : limits[resource]
  const allowed = limit === -1 || current < limit

  return {
    allowed,
    current,
    limit
  }
}
