import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import { getPrismaClient } from '../db/prisma'

type AuthType = 'registration' | 'authentication'

function getRpId(): string {
  const explicit = process.env.WEBAUTHN_RP_ID
  if (explicit) return explicit

  if (process.env.SSO_CALLBACK_BASE_URL) {
    try {
      return new URL(process.env.SSO_CALLBACK_BASE_URL).hostname
    } catch {
      return 'safe-node.app'
    }
  }

  return 'safe-node.app'
}

function getExpectedOrigins(): string[] {
  const origins = new Set<string>([
    'https://safe-node.app',
    'https://www.safe-node.app',
    'http://localhost:5173',
  ])

  const envOrigins = [process.env.FRONTEND_URL, process.env.SSO_CALLBACK_BASE_URL, process.env.CORS_ORIGIN]
  for (const value of envOrigins) {
    if (!value) continue
    for (const item of value.split(',')) {
      const origin = item.trim()
      if (!origin) continue
      if (origin.startsWith('http://') || origin.startsWith('https://')) {
        origins.add(origin)
      }
    }
  }

  return Array.from(origins)
}

async function storeChallenge(userId: string, challenge: string, type: AuthType): Promise<void> {
  const prisma = getPrismaClient()

  await prisma.webAuthnChallenge.deleteMany({
    where: {
      userId,
      type,
    },
  })

  await prisma.webAuthnChallenge.create({
    data: {
      userId,
      challenge,
      type,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  })
}

async function getChallenge(userId: string, type: AuthType): Promise<string> {
  const prisma = getPrismaClient()
  const record = await prisma.webAuthnChallenge.findFirst({
    where: {
      userId,
      type,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!record) {
    throw new Error('WebAuthn challenge has expired. Please try again.')
  }

  return record.challenge
}

async function consumeChallenges(userId: string, type: AuthType): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.webAuthnChallenge.deleteMany({
    where: {
      userId,
      type,
    },
  })
}

export async function createRegistrationOptions(userId: string, userEmail: string): Promise<any> {
  const rpID = getRpId()

  const options = await generateRegistrationOptions({
    rpID,
    rpName: 'SafeNode',
    userName: userEmail,
    userID: new TextEncoder().encode(userId),
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    supportedAlgorithmIDs: [-7, -257],
  })

  await storeChallenge(userId, options.challenge, 'registration')

  return options
}

export async function verifyRegistration(
  userId: string,
  registrationResponse: any,
): Promise<{ verified: boolean; message: string }> {
  const prisma = getPrismaClient()
  const expectedChallenge = await getChallenge(userId, 'registration')

  let verification: VerifiedRegistrationResponse
  try {
    verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
    })
  } catch (error: any) {
    await consumeChallenges(userId, 'registration')
    throw new Error(error?.message || 'Registration verification failed')
  }

  const { verified, registrationInfo } = verification
  if (!verified || !registrationInfo) {
    await consumeChallenges(userId, 'registration')
    return { verified: false, message: 'Registration verification failed' }
  }

  const transports = (registrationResponse?.response?.transports || []) as AuthenticatorTransportFuture[]

  await prisma.webAuthnCredential.upsert({
    where: { credentialId: registrationInfo.credential.id },
    update: {
      publicKey: Buffer.from(registrationInfo.credential.publicKey).toString('base64url'),
      counter: BigInt(registrationInfo.credential.counter),
      transports,
      deviceType: registrationInfo.credentialDeviceType,
      backedUp: registrationInfo.credentialBackedUp,
      lastUsedAt: new Date(),
    },
    create: {
      userId,
      credentialId: registrationInfo.credential.id,
      publicKey: Buffer.from(registrationInfo.credential.publicKey).toString('base64url'),
      counter: BigInt(registrationInfo.credential.counter),
      transports,
      deviceType: registrationInfo.credentialDeviceType,
      backedUp: registrationInfo.credentialBackedUp,
      lastUsedAt: new Date(),
    },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { biometricEnabled: true },
  })

  await consumeChallenges(userId, 'registration')
  return { verified: true, message: 'Biometric credential registered successfully' }
}

export async function createAuthenticationOptions(userId: string): Promise<any> {
  const prisma = getPrismaClient()
  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId },
    select: {
      credentialId: true,
      transports: true,
    },
  })

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: 'required',
    allowCredentials: credentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: cred.transports as AuthenticatorTransportFuture[],
    })),
  })

  await storeChallenge(userId, options.challenge, 'authentication')

  return options
}

export async function verifyAuthentication(
  userId: string,
  authenticationResponse: any,
): Promise<{ verified: boolean; message: string }> {
  const prisma = getPrismaClient()
  const expectedChallenge = await getChallenge(userId, 'authentication')

  const credential = await prisma.webAuthnCredential.findUnique({
    where: {
      credentialId: authenticationResponse?.id,
    },
  })

  if (!credential || credential.userId !== userId) {
    await consumeChallenges(userId, 'authentication')
    throw new Error('Credential not found')
  }

  let verification: VerifiedAuthenticationResponse
  try {
    verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, 'base64url'),
        counter: Number(credential.counter),
        transports: credential.transports as AuthenticatorTransportFuture[],
      },
      requireUserVerification: true,
    })
  } catch (error: any) {
    await consumeChallenges(userId, 'authentication')
    throw new Error(error?.message || 'Authentication verification failed')
  }

  if (!verification.verified || !verification.authenticationInfo) {
    await consumeChallenges(userId, 'authentication')
    return { verified: false, message: 'Authentication verification failed' }
  }

  await prisma.webAuthnCredential.update({
    where: { credentialId: credential.credentialId },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  })

  await consumeChallenges(userId, 'authentication')
  return { verified: true, message: 'Authentication verified' }
}
