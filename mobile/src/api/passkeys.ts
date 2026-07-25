import { Passkey, type PasskeyCreateRequest, type PasskeyCreateResult, type PasskeyGetRequest, type PasskeyGetResult } from 'react-native-passkey'
import { apiRequest } from './client'

export interface AuthUser {
  id: string
  email: string
  displayName?: string | null
  subscriptionTier?: string
  hasVault?: boolean
  recoveryKitConfigured?: boolean
}

interface AuthResult { success: boolean; token: string; userId: string; user: AuthUser }

export interface PasskeyVaultWrap {
  credentialId: string
  friendlyName: string
  prfReady: boolean
  prfSalt?: string | null
  prfWrappedVaultKey?: string | null
  prfWrappedVaultKeyIV?: string | null
}

function registrationPayload(result: PasskeyCreateResult) {
  return {
    credential: {
      id: result.id,
      rawId: result.rawId,
      type: result.type || 'public-key',
      transports: result.response.transports || [],
    },
    attestation: {
      clientDataJSON: result.response.clientDataJSON,
      attestationObject: result.response.attestationObject,
    },
    clientExtensionResults: result.clientExtensionResults || {},
  }
}

function authenticationPayload(result: PasskeyGetResult) {
  return {
    credential: {
      id: result.id,
      rawId: result.rawId || result.id,
      type: result.type || 'public-key',
    },
    assertion: {
      clientDataJSON: result.response.clientDataJSON,
      authenticatorData: result.response.authenticatorData,
      signature: result.response.signature,
      userHandle: result.response.userHandle || null,
    },
    clientExtensionResults: result.clientExtensionResults || {},
  }
}

export function arePasskeysSupported(): boolean {
  return Passkey.isSupported()
}

export async function signUpWithPasskey(email: string, displayName: string): Promise<AuthResult> {
  const start = await apiRequest<{ flowId: string; options: PasskeyCreateRequest }>('/api/passkeys/signup/options', {
    method: 'POST',
    body: JSON.stringify({ email, displayName }),
  })
  const credential = await Passkey.create({
    ...start.options,
    extensions: { ...start.options.extensions, prf: {} },
  })
  return apiRequest<AuthResult>('/api/passkeys/signup/verify', {
    method: 'POST',
    body: JSON.stringify({ flowId: start.flowId, ...registrationPayload(credential) }),
  })
}

export async function signInWithPasskey(email: string): Promise<AuthResult> {
  const start = await apiRequest<{ flowId: string; options: PasskeyGetRequest }>('/api/passkeys/login/options', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  const assertion = await Passkey.get(start.options)
  return apiRequest<AuthResult>('/api/passkeys/login/verify', {
    method: 'POST',
    body: JSON.stringify({ flowId: start.flowId, ...authenticationPayload(assertion) }),
  })
}

export const listPasskeyVaultWraps = async () => {
  const result = await apiRequest<{ passkeys: PasskeyVaultWrap[] }>('/api/passkeys/vault-unlock')
  return result.passkeys
}

export async function authenticateForVault(wraps: PasskeyVaultWrap[]): Promise<PasskeyGetResult> {
  const ready = wraps.filter((wrap) => wrap.prfReady && wrap.prfSalt)
  if (!ready.length) throw new Error('No passkey has been enrolled for cryptographic vault unlock yet.')
  const options = await apiRequest<PasskeyGetRequest>('/api/passkeys/authenticate/options', {
    method: 'POST',
    body: JSON.stringify({ credentialIds: ready.map((wrap) => wrap.credentialId) }),
  })
  const assertion = await Passkey.get({
    ...options,
    extensions: {
      ...options.extensions,
      prf: {
        evalByCredential: Object.fromEntries(ready.map((wrap) => [wrap.credentialId, { first: toBase64Url(wrap.prfSalt!) }])),
      },
    },
  })
  await apiRequest<{ success: boolean }>('/api/passkeys/authenticate/verify', {
    method: 'POST',
    body: JSON.stringify(authenticationPayload(assertion)),
  })
  return assertion
}

function toBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
