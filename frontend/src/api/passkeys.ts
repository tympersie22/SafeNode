import { API_BASE } from '../config/api'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { getCurrentDeviceId } from '../services/deviceService'
import type { AuthResponse } from '../services/authService'
import type { PasskeyRecord, PasskeyVaultUnlockRecord } from '../types/passkeys'

interface NativePasskeyResult {
  payload: Record<string, unknown>
  credentialId?: string
  clientExtensionResults?: AuthenticationExtensionsClientOutputs
}

interface NativePasskeysPlugin {
  register(options: { options: Record<string, unknown> }): Promise<NativePasskeyResult>
  authenticate(options: { options: Record<string, unknown> }): Promise<NativePasskeyResult>
}

const nativePasskeys = registerPlugin<NativePasskeysPlugin>('NativePasskeys')
const useNativeIOSPasskeys = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

const getAuthHeader = (): string => {
  const token = localStorage.getItem('safenode_token')
  return token ? `Bearer ${token}` : ''
}

export const base64UrlToBuffer = (value: string): ArrayBuffer => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const decoded = window.atob(padded)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i)
  }
  return bytes.buffer
}

export const bufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = window.btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function getCommonHeaders(includeJson = false): HeadersInit {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'X-Device-ID': getCurrentDeviceId(),
  }
}

function createPrfProbeExtension(): AuthenticationExtensionsClientInputs {
  const probe = new Uint8Array(32)
  window.crypto.getRandomValues(probe)
  return {
    prf: {
      eval: {
        first: probe,
      },
    },
  }
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const error = await res.json().catch(() => ({ message: fallback }))
  throw new Error(error.message || error.error || fallback)
}

function buildCreationOptions(
  optionsJson: any,
  extensions?: AuthenticationExtensionsClientInputs
): PublicKeyCredentialCreationOptions {
  return {
    challenge: base64UrlToBuffer(optionsJson.challenge),
    rp: optionsJson.rp,
    user: {
      ...optionsJson.user,
      id: base64UrlToBuffer(optionsJson.user.id),
    },
    pubKeyCredParams: optionsJson.pubKeyCredParams,
    timeout: optionsJson.timeout,
    attestation: optionsJson.attestation,
    authenticatorSelection: optionsJson.authenticatorSelection,
    extensions,
  }
}

function buildRequestOptions(
  optionsJson: any,
  extensions?: AuthenticationExtensionsClientInputs
): PublicKeyCredentialRequestOptions {
  const allowCredentials = Array.isArray(optionsJson.allowCredentials)
    ? optionsJson.allowCredentials.map((cred: any) => ({
        type: cred.type,
        id: base64UrlToBuffer(cred.id || cred.rawId || ''),
        transports: cred.transports,
      }))
    : undefined

  return {
    challenge: base64UrlToBuffer(optionsJson.challenge),
    timeout: optionsJson.timeout,
    rpId: optionsJson.rpId,
    allowCredentials,
    userVerification: optionsJson.userVerification,
    extensions,
  }
}

async function collectRegistrationPayload(
  publicKey: PublicKeyCredentialCreationOptions,
  optionsJson: Record<string, unknown>
) {
  if (useNativeIOSPasskeys()) {
    const result = await nativePasskeys.register({ options: optionsJson })
    return {
      payload: result.payload,
      clientExtensionResults: result.clientExtensionResults || {},
    }
  }

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null
  if (!credential) {
    throw new Error('Passkey registration was cancelled.')
  }

  const attestationResponse = credential.response as AuthenticatorAttestationResponse
  const transports = (attestationResponse as any).getTransports?.() ?? []

  return {
    credential,
    clientExtensionResults: credential.getClientExtensionResults?.() || {},
    payload: {
      credential: {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        transports,
      },
      attestation: {
        clientDataJSON: bufferToBase64Url(attestationResponse.clientDataJSON),
        attestationObject: bufferToBase64Url(attestationResponse.attestationObject),
      },
    },
  }
}

async function collectAuthenticationPayload(
  publicKey: PublicKeyCredentialRequestOptions,
  optionsJson: Record<string, unknown>
) {
  if (useNativeIOSPasskeys()) {
    const result = await nativePasskeys.authenticate({ options: optionsJson })
    if (!result.credentialId) throw new Error('Native passkey response did not include a credential ID')
    return {
      assertion: { id: result.credentialId },
      clientExtensionResults: result.clientExtensionResults || {},
      payload: result.payload,
    }
  }

  const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null
  if (!assertion) {
    throw new Error('Passkey sign-in was cancelled.')
  }

  const authResponse = assertion.response as AuthenticatorAssertionResponse
  return {
    assertion,
    clientExtensionResults: assertion.getClientExtensionResults?.() || {},
    payload: {
      credential: {
        id: assertion.id,
        rawId: bufferToBase64Url(assertion.rawId),
        type: assertion.type,
      },
      assertion: {
        clientDataJSON: bufferToBase64Url(authResponse.clientDataJSON),
        authenticatorData: bufferToBase64Url(authResponse.authenticatorData),
        signature: bufferToBase64Url(authResponse.signature),
        userHandle: authResponse.userHandle ? bufferToBase64Url(authResponse.userHandle) : null,
      },
    },
  }
}

export interface RegisterPasskeyResult {
  passkey: PasskeyRecord
  prfEnabled: boolean
}

export interface VerifiedPasskeyAssertionResult {
  credentialId: string
  clientExtensionResults: AuthenticationExtensionsClientOutputs
}

export const listPasskeys = async (): Promise<PasskeyRecord[]> => {
  const res = await fetch(`${API_BASE}/api/passkeys`, {
    headers: {
      Authorization: getAuthHeader(),
    },
  })
  if (!res.ok) {
    throw new Error('Failed to load passkeys')
  }
  const data = await res.json()
  return data.passkeys as PasskeyRecord[]
}

export const deletePasskey = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/passkeys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      Authorization: getAuthHeader(),
    },
  })
  if (!res.ok) {
    throw new Error('Failed to delete passkey')
  }
}

export const registerPasskey = async (
  friendlyName?: string,
  options: {
    extensions?: AuthenticationExtensionsClientInputs
  } = {}
): Promise<RegisterPasskeyResult> => {
  const optionsResponse = await fetch(`${API_BASE}/api/passkeys/register/options`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      ...getCommonHeaders(),
    },
  })
  if (!optionsResponse.ok) {
    await parseError(optionsResponse, 'Failed to begin passkey registration')
  }
  const optionsJson = await optionsResponse.json()
  const registration = await collectRegistrationPayload(
    buildCreationOptions(optionsJson, options.extensions || createPrfProbeExtension()),
    optionsJson
  )

  const verifyRes = await fetch(`${API_BASE}/api/passkeys/register/verify`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      ...getCommonHeaders(true),
    },
    body: JSON.stringify({
      ...registration.payload,
      friendlyName,
    }),
  })

  if (!verifyRes.ok) {
    await parseError(verifyRes, 'Failed to save passkey')
  }

  const data = await verifyRes.json()
  return {
    passkey: data.passkey as PasskeyRecord,
    prfEnabled: Boolean((registration.clientExtensionResults as AuthenticationExtensionsClientOutputs).prf?.enabled),
  }
}

export const authenticateWithPasskey = async (
  options: {
    credentialIds?: string[]
    extensions?: AuthenticationExtensionsClientInputs
  } = {}
): Promise<VerifiedPasskeyAssertionResult> => {
  const optionsResponse = await fetch(`${API_BASE}/api/passkeys/authenticate/options`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      ...getCommonHeaders(true),
    },
    body: JSON.stringify({
      credentialIds: options.credentialIds,
    }),
  })
  if (!optionsResponse.ok) {
    await parseError(optionsResponse, 'Failed to request authentication options')
  }
  const optionsJson = await optionsResponse.json()
  const authentication = await collectAuthenticationPayload(
    buildRequestOptions(optionsJson, options.extensions),
    optionsJson
  )

  const verifyRes = await fetch(`${API_BASE}/api/passkeys/authenticate/verify`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      ...getCommonHeaders(true),
    },
    body: JSON.stringify(authentication.payload),
  })

  if (!verifyRes.ok) {
    await parseError(verifyRes, 'Failed to verify passkey authentication')
  }

  return {
    credentialId: authentication.assertion.id,
    clientExtensionResults: authentication.clientExtensionResults as AuthenticationExtensionsClientOutputs,
  }
}

export const listPasskeyVaultUnlocks = async (): Promise<PasskeyVaultUnlockRecord[]> => {
  const res = await fetch(`${API_BASE}/api/passkeys/vault-unlock`, {
    headers: {
      Authorization: getAuthHeader(),
    },
  })

  if (!res.ok) {
    throw new Error('Failed to load passkey vault unlock records')
  }

  const data = await res.json()
  return data.passkeys as PasskeyVaultUnlockRecord[]
}

export const savePasskeyVaultUnlock = async (
  credentialId: string,
  payload: {
    prfSalt: string
    prfWrappedVaultKey: string
    prfWrappedVaultKeyIV: string
  }
): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/passkeys/${encodeURIComponent(credentialId)}/vault-unlock`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      ...getCommonHeaders(true),
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    await parseError(res, 'Failed to save passkey vault unlock')
  }
}

export async function signUpWithPasskey(input: {
  email: string
  displayName?: string
}): Promise<AuthResponse> {
  const optionsResponse = await fetch(`${API_BASE}/api/passkeys/signup/options`, {
    method: 'POST',
    headers: getCommonHeaders(true),
    credentials: 'include',
    body: JSON.stringify(input),
  })

  if (!optionsResponse.ok) {
    await parseError(optionsResponse, 'Failed to begin passkey sign-up')
  }

  const optionsJson = await optionsResponse.json()
  const registration = await collectRegistrationPayload(
    buildCreationOptions(optionsJson.options, createPrfProbeExtension()),
    optionsJson.options
  )

  const verifyRes = await fetch(`${API_BASE}/api/passkeys/signup/verify`, {
    method: 'POST',
    headers: getCommonHeaders(true),
    credentials: 'include',
    body: JSON.stringify({
      flowId: optionsJson.flowId,
      ...registration.payload,
    }),
  })

  if (!verifyRes.ok) {
    await parseError(verifyRes, 'Failed to finish passkey sign-up')
  }

  return verifyRes.json()
}

export async function signInWithPasskey(email: string): Promise<AuthResponse> {
  const optionsResponse = await fetch(`${API_BASE}/api/passkeys/login/options`, {
    method: 'POST',
    headers: getCommonHeaders(true),
    credentials: 'include',
    body: JSON.stringify({ email }),
  })

  if (!optionsResponse.ok) {
    await parseError(optionsResponse, 'Failed to begin passkey sign-in')
  }

  const optionsJson = await optionsResponse.json()
  const authentication = await collectAuthenticationPayload(
    buildRequestOptions(optionsJson.options),
    optionsJson.options
  )

  const verifyRes = await fetch(`${API_BASE}/api/passkeys/login/verify`, {
    method: 'POST',
    headers: getCommonHeaders(true),
    credentials: 'include',
    body: JSON.stringify({
      flowId: optionsJson.flowId,
      ...authentication.payload,
    }),
  })

  if (!verifyRes.ok) {
    await parseError(verifyRes, 'Failed to finish passkey sign-in')
  }

  return verifyRes.json()
}
