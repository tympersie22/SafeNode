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

export function getRpId(): string {
  const explicit = process.env.WEBAUTHN_RP_ID
  if (explicit) return explicit

  if ((process.env.NODE_ENV || 'development') !== 'production') {
    return 'localhost'
  }

  if (process.env.SSO_CALLBACK_BASE_URL) {
    try {
      return new URL(process.env.SSO_CALLBACK_BASE_URL).hostname
    } catch {
      return 'safe-node.app'
    }
  }

  return 'safe-node.app'
}

export function getExpectedOrigins(): string[] {
  const origins = new Set<string>([
    'https://safe-node.app',
    'https://www.safe-node.app',
    // Android Credential Manager binds assertions to the release signing certificate.
    'android:apk-key-hash:KeiCwzfFwJDklJ1nixTpfuRkV7iK2AEgy0bcOvmwrbc',
    'http://localhost:5173',
    'http://localhost:5174', // common Vite fallback port
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ])

  const envOrigins = [process.env.FRONTEND_URL, process.env.SSO_CALLBACK_BASE_URL, process.env.CORS_ORIGIN, process.env.WEBAUTHN_ORIGIN]
  for (const value of envOrigins) {
    if (!value) continue
    for (const item of value.split(',')) {
      const origin = item.trim()
      if (!origin) continue
      if (origin.startsWith('http://') || origin.startsWith('https://') || origin.startsWith('android:apk-key-hash:')) {
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

export async function createRegistrationOptionsForIdentity(userId: string, userEmail: string): Promise<any> {
  return generateRegistrationOptions({
    rpID: getRpId(),
    rpName: 'Safenode',
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
}

export async function createAuthenticationOptionsForCredentials(
  credentials: Array<{ credentialId: string; transports: string[] }>
): Promise<any> {
  return generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: 'required',
    allowCredentials: credentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: cred.transports as AuthenticatorTransportFuture[],
    })),
  })
}

async function upsertCredentialForUser(
  userId: string,
  registrationResponse: any,
  verification: VerifiedRegistrationResponse
): Promise<void> {
  const prisma = getPrismaClient()
  const registrationInfo = verification.registrationInfo
  if (!verification.verified || !registrationInfo) {
    throw new Error('Registration verification failed')
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
      userId,
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
}

export async function verifyDetachedRegistration(
  userId: string,
  expectedChallenge: string,
  registrationResponse: any,
): Promise<{ verified: boolean; message: string }> {
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
    throw new Error(error?.message || 'Registration verification failed')
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { verified: false, message: 'Registration verification failed' }
  }

  await upsertCredentialForUser(userId, registrationResponse, verification)
  return { verified: true, message: 'Biometric credential registered successfully' }
}

export async function verifyDetachedAuthentication(
  credential: {
    credentialId: string
    publicKey: string
    counter: bigint | number
    transports: string[]
  },
  expectedChallenge: string,
  authenticationResponse: any,
): Promise<{ verified: boolean; message: string }> {
  const prisma = getPrismaClient()

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
    throw new Error(error?.message || 'Authentication verification failed')
  }

  if (!verification.verified || !verification.authenticationInfo) {
    return { verified: false, message: 'Authentication verification failed' }
  }

  await prisma.webAuthnCredential.update({
    where: { credentialId: credential.credentialId },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  })

  return { verified: true, message: 'Authentication verified' }
}

export async function createRegistrationOptions(userId: string, userEmail: string): Promise<any> {
  const options = await createRegistrationOptionsForIdentity(userId, userEmail)

  await storeChallenge(userId, options.challenge, 'registration')

  return options
}

export async function verifyRegistration(
  userId: string,
  registrationResponse: any,
): Promise<{ verified: boolean; message: string }> {
  const expectedChallenge = await getChallenge(userId, 'registration')
  try {
    const result = await verifyDetachedRegistration(userId, expectedChallenge, registrationResponse)
    await consumeChallenges(userId, 'registration')
    return result
  } catch (error: any) {
    await consumeChallenges(userId, 'registration')
    throw new Error(error?.message || 'Registration verification failed')
  }
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

  const options = await createAuthenticationOptionsForCredentials(credentials)

  await storeChallenge(userId, options.challenge, 'authentication')

  return options
}

export async function createAuthenticationOptionsForCredentialIds(
  userId: string,
  credentialIds: string[]
): Promise<any> {
  const prisma = getPrismaClient()
  const credentials = await prisma.webAuthnCredential.findMany({
    where: {
      userId,
      credentialId: {
        in: credentialIds,
      },
    },
    select: {
      credentialId: true,
      transports: true,
    },
  })

  if (credentials.length === 0) {
    throw new Error('No registered passkeys are available for this account.')
  }

  const options = await createAuthenticationOptionsForCredentials(credentials)

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

  try {
    const result = await verifyDetachedAuthentication(credential, expectedChallenge, authenticationResponse)
    await consumeChallenges(userId, 'authentication')
    return result
  } catch (error: any) {
    await consumeChallenges(userId, 'authentication')
    throw new Error(error?.message || 'Authentication verification failed')
  }
}
