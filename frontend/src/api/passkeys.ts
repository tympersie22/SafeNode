import { API_BASE } from '../config/api'
import { getCurrentDeviceId } from '../services/deviceService'
import type { AuthResponse } from '../services/authService'
import type { PasskeyRecord } from '../types/passkeys'

const getAuthHeader = (): string => {
  const token = localStorage.getItem('safenode_token')
  return token ? `Bearer ${token}` : ''
}

const base64UrlToBuffer = (value: string): ArrayBuffer => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const decoded = window.atob(padded)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i)
  }
  return bytes.buffer
}

const bufferToBase64Url = (buffer: ArrayBuffer): string => {
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

async function parseError(res: Response, fallback: string): Promise<never> {
  const error = await res.json().catch(() => ({ message: fallback }))
  throw new Error(error.message || error.error || fallback)
}

function buildCreationOptions(optionsJson: any): PublicKeyCredentialCreationOptions {
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
  }
}

function buildRequestOptions(optionsJson: any): PublicKeyCredentialRequestOptions {
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
  }
}

async function collectRegistrationPayload(publicKey: PublicKeyCredentialCreationOptions) {
  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null
  if (!credential) {
    throw new Error('Passkey registration was cancelled.')
  }

  const attestationResponse = credential.response as AuthenticatorAttestationResponse
  const transports = (attestationResponse as any).getTransports?.() ?? []

  return {
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
  }
}

async function collectAuthenticationPayload(publicKey: PublicKeyCredentialRequestOptions) {
  const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null
  if (!assertion) {
    throw new Error('Passkey sign-in was cancelled.')
  }

  const authResponse = assertion.response as AuthenticatorAssertionResponse
  return {
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
  }
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

export const registerPasskey = async (friendlyName?: string): Promise<PasskeyRecord> => {
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
  const payload = await collectRegistrationPayload(buildCreationOptions(optionsJson))

  const verifyRes = await fetch(`${API_BASE}/api/passkeys/register/verify`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      ...getCommonHeaders(true),
    },
    body: JSON.stringify({
      ...payload,
      friendlyName,
    }),
  })

  if (!verifyRes.ok) {
    await parseError(verifyRes, 'Failed to save passkey')
  }

  const data = await verifyRes.json()
  return data.passkey as PasskeyRecord
}

export const authenticateWithPasskey = async (): Promise<void> => {
  const optionsResponse = await fetch(`${API_BASE}/api/passkeys/authenticate/options`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      ...getCommonHeaders(),
    },
  })
  if (!optionsResponse.ok) {
    await parseError(optionsResponse, 'Failed to request authentication options')
  }
  const optionsJson = await optionsResponse.json()
  const payload = await collectAuthenticationPayload(buildRequestOptions(optionsJson))

  const verifyRes = await fetch(`${API_BASE}/api/passkeys/authenticate/verify`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      ...getCommonHeaders(true),
    },
    body: JSON.stringify(payload),
  })

  if (!verifyRes.ok) {
    await parseError(verifyRes, 'Failed to verify passkey authentication')
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
  const payload = await collectRegistrationPayload(buildCreationOptions(optionsJson.options))

  const verifyRes = await fetch(`${API_BASE}/api/passkeys/signup/verify`, {
    method: 'POST',
    headers: getCommonHeaders(true),
    credentials: 'include',
    body: JSON.stringify({
      flowId: optionsJson.flowId,
      ...payload,
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
  const payload = await collectAuthenticationPayload(buildRequestOptions(optionsJson.options))

  const verifyRes = await fetch(`${API_BASE}/api/passkeys/login/verify`, {
    method: 'POST',
    headers: getCommonHeaders(true),
    credentials: 'include',
    body: JSON.stringify({
      flowId: optionsJson.flowId,
      ...payload,
    }),
  })

  if (!verifyRes.ok) {
    await parseError(verifyRes, 'Failed to finish passkey sign-in')
  }

  return verifyRes.json()
}
