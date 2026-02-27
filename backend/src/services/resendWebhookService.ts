import { createHmac, timingSafeEqual } from 'crypto'

type ResendWebhookHeaders = {
  id: string
  timestamp: string
  signature: string
}

function extractV1Signatures(signatureHeader: string): string[] {
  return signatureHeader
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [version, signature] = part.split(',')
      if (version === 'v1' && signature) return signature
      return null
    })
    .filter((value): value is string => Boolean(value))
}

export function verifyResendWebhookSignature(
  rawBody: Buffer,
  headers: ResendWebhookHeaders,
  webhookSecret: string,
): boolean {
  const payloadToSign = `${headers.id}.${headers.timestamp}.${rawBody.toString('utf8')}`
  const normalizedSecret = webhookSecret.startsWith('whsec_')
    ? webhookSecret.slice('whsec_'.length)
    : webhookSecret
  const secretBytes = Buffer.from(normalizedSecret, 'base64')

  const expected = createHmac('sha256', secretBytes).update(payloadToSign).digest('base64')
  const expectedBuffer = Buffer.from(expected)

  const signatures = extractV1Signatures(headers.signature)
  if (signatures.length === 0) return false

  for (const candidate of signatures) {
    const candidateBuffer = Buffer.from(candidate)
    if (
      candidateBuffer.length === expectedBuffer.length &&
      timingSafeEqual(candidateBuffer, expectedBuffer)
    ) {
      return true
    }
  }

  return false
}

