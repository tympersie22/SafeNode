/**
 * Billing Routes
 * Stripe subscription and billing endpoints
 */

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth'
import {
  createCheckoutSession,
  createPortalSession,
  handleStripeWebhook,
  checkSubscriptionLimits
} from '../services/stripeService'
// Stripe will be imported dynamically
import { z } from 'zod'

const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url('Success URL must be a valid URL'),
  cancelUrl: z.string().url('Cancel URL must be a valid URL')
})

const portalSchema = z.object({
  returnUrl: z.string().url('Return URL must be a valid URL')
})

/**
 * Register billing routes
 */
export async function registerBillingRoutes(server: FastifyInstance) {
  /**
   * POST /api/billing/create-checkout-session
   * Create Stripe checkout session (requires authentication)
   */
  server.post('/api/billing/create-checkout-session', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any

      // Validate input
      const validation = checkoutSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { priceId, successUrl, cancelUrl } = validation.data

      // Create checkout session
      const session = await createCheckoutSession(
        user.id,
        priceId,
        successUrl,
        cancelUrl
      )

      return {
        success: true,
        sessionId: session.sessionId,
        url: session.url
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to create checkout session'
      })
    }
  })

  /**
   * POST /api/billing/portal
   * Create Stripe customer portal session (requires authentication)
   */
  server.post('/api/billing/portal', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const body = request.body as any

      // Validate input
      const validation = portalSchema.safeParse(body)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid input',
          details: validation.error.errors
        })
      }

      const { returnUrl } = validation.data

      // Create portal session
      const session = await createPortalSession(user.id, returnUrl)

      return {
        success: true,
        url: session.url
      }
    } catch (error: any) {
      request.log.error(error)
      
      if (error.message?.includes('does not have an active subscription')) {
        return reply.code(400).send({
          error: 'no_subscription',
          message: 'User does not have an active subscription'
        })
      }

      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to create portal session'
      })
    }
  })

  /**
   * POST /api/billing/webhook
   * Handle Stripe webhook events (public endpoint with signature verification)
   */
  server.post('/api/billing/webhook', {
    config: { rawBody: true }
  }, async (request, reply) => {
    try {
      // Dynamic import to avoid type checking issues
      // @ts-ignore - Stripe is installed but TypeScript may not resolve it
      const stripeModule = await import('stripe')
      const Stripe = stripeModule.default || stripeModule
      const stripe = process.env.STRIPE_SECRET_KEY 
        // @ts-ignore - Stripe constructor is valid
        ? new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-11-20.acacia',
            typescript: true
          })
        : null

      if (!stripe) {
        return reply.code(500).send({
          error: 'stripe_not_configured',
          message: 'Stripe is not configured'
        })
      }

      const signature = request.headers['stripe-signature'] as string
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

      if (!signature || !webhookSecret) {
        return reply.code(400).send({
          error: 'missing_signature',
          message: 'Stripe signature or webhook secret is missing'
        })
      }

      // Verify webhook signature
      let event: any
      try {
        // Use raw body from fastify-raw-body plugin for accurate signature verification
        const rawBody = (request as any).rawBody
        if (!rawBody) {
          request.log.error('Raw body not available for webhook signature verification')
          return reply.code(500).send({
            error: 'server_error',
            message: 'Raw body not available for webhook verification'
          })
        }

        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret
        )
      } catch (err: any) {
        request.log.error({ error: err }, 'Webhook signature verification failed')
        return reply.code(400).send({
          error: 'invalid_signature',
          message: 'Invalid webhook signature'
        })
      }

      // Handle webhook event
      await handleStripeWebhook(event)

      return { received: true }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to process webhook'
      })
    }
  })

  /**
   * GET /api/billing/limits
   * Get subscription limits for current user (requires authentication)
   */
  server.get('/api/billing/limits', {
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = (request as any).user
      const query = request.query as { resource?: string }

      const resource = query.resource as 'devices' | 'vaults' | 'teamMembers' | 'storage' | undefined

      if (resource) {
        // Check single resource limit
        const limit = await checkSubscriptionLimits(user.id, resource)
        return {
          resource,
          allowed: limit.allowed,
          current: limit.current,
          limit: limit.limit
        }
      } else {
        // Return all limits
        const devices = await checkSubscriptionLimits(user.id, 'devices')
        const vaults = await checkSubscriptionLimits(user.id, 'vaults')
        const teamMembers = await checkSubscriptionLimits(user.id, 'teamMembers')
        const storage = await checkSubscriptionLimits(user.id, 'storage')

        return {
          devices: {
            allowed: devices.allowed,
            current: devices.current,
            limit: devices.limit
          },
          vaults: {
            allowed: vaults.allowed,
            current: vaults.current,
            limit: vaults.limit
          },
          teamMembers: {
            allowed: teamMembers.allowed,
            current: teamMembers.current,
            limit: teamMembers.limit
          },
          storage: {
            allowed: storage.allowed,
            current: storage.current,
            limit: storage.limit
          }
        }
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch subscription limits'
      })
    }
  })
}

