import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'safenode.session.token'
const DEVICE_KEY = 'safenode.device.id'
const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://api.safe-node.app').replace(/\/$/, '')

let tokenCache: string | null = null
let deviceIdCache: string | null = null

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message)
  }
}

export async function getDeviceId(): Promise<string> {
  if (deviceIdCache) return deviceIdCache
  const stored = await SecureStore.getItemAsync(DEVICE_KEY)
  if (stored) {
    deviceIdCache = stored
    return stored
  }
  const created = `mobile-${Crypto.randomUUID()}`
  await SecureStore.setItemAsync(DEVICE_KEY, created)
  deviceIdCache = created
  return created
}

export async function loadToken(): Promise<string | null> {
  if (tokenCache) return tokenCache
  tokenCache = await SecureStore.getItemAsync(TOKEN_KEY)
  return tokenCache
}

export async function saveToken(token: string): Promise<void> {
  tokenCache = token
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
}

export async function clearToken(): Promise<void> {
  tokenCache = null
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const [token, deviceId] = await Promise.all([loadToken(), getDeviceId()])
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-Device-ID', deviceId)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(payload?.message || payload?.error || `Request failed (${response.status})`, response.status, payload?.error)
  }
  return payload as T
}
