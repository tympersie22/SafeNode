import { createHash } from 'crypto'
import { getPrismaClient } from '../db/prisma'

export async function recordWebhookEvent(
  provider: 'stripe' | 'paddle' | 'resend',
  eventId: string,
  rawBody: Buffer,
): Promise<'new' | 'duplicate'> {
  const prisma = getPrismaClient()
  const payloadHash = createHash('sha256').update(rawBody).digest('hex')

  try {
    await prisma.billingWebhookEvent.create({
      data: {
        provider,
        eventId,
        payloadHash,
      },
    })

    return 'new'
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return 'duplicate'
    }
    throw error
  }
}
