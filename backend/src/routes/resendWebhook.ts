import { FastifyInstance } from 'fastify'
import { recordWebhookEvent } from '../services/webhookIdempotencyService'
import { verifyResendWebhookSignature } from '../services/resendWebhookService'

export async function registerResendWebhookRoutes(server: FastifyInstance) {
  server.post('/api/webhooks/resend', { config: { rawBody: true } }, async (request, reply) => {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (!webhookSecret) {
      return reply.code(500).send({
        error: 'resend_webhook_not_configured',
        message: 'RESEND_WEBHOOK_SECRET is not configured',
      })
    }

    const id = request.headers['svix-id']
    const timestamp = request.headers['svix-timestamp']
    const signature = request.headers['svix-signature']

    if (
      typeof id !== 'string' ||
      typeof timestamp !== 'string' ||
      typeof signature !== 'string'
    ) {
      return reply.code(400).send({
        error: 'missing_signature_headers',
        message: 'Missing required svix webhook headers',
      })
    }

    const rawBody = (request as any).rawBody as Buffer | undefined
    if (!rawBody) {
      request.log.error('Raw body not available for Resend webhook verification')
      return reply.code(500).send({
        error: 'server_error',
        message: 'Raw body not available for webhook verification',
      })
    }

    const signatureValid = verifyResendWebhookSignature(
      rawBody,
      { id, timestamp, signature },
      webhookSecret,
    )

    if (!signatureValid) {
      return reply.code(400).send({
        error: 'invalid_signature',
        message: 'Invalid webhook signature',
      })
    }

    let payload: any
    try {
      payload = JSON.parse(rawBody.toString('utf8'))
    } catch (error: any) {
      return reply.code(400).send({
        error: 'invalid_json',
        message: 'Invalid webhook JSON payload',
      })
    }

    const eventId = id || payload?.data?.email_id || payload?.id
    if (!eventId) {
      return reply.code(400).send({
        error: 'missing_event_id',
        message: 'Webhook event ID is missing',
      })
    }

    const status = await recordWebhookEvent('resend', eventId, rawBody)
    if (status === 'duplicate') {
      return { received: true, duplicate: true }
    }

    request.log.info(
      {
        eventType: payload?.type || payload?.event,
        eventId,
      },
      'Processed Resend webhook event',
    )

    return { received: true }
  })
}

