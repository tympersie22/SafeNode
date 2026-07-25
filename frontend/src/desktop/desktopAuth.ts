import { API_BASE } from '../config/api'
import { getCurrentDeviceId } from '../services/deviceService'
import type { AuthResponse } from '../services/authService'
import { isTauri } from './integration'

interface PendingDesktopAuthorization {
  flowId: string
  state: string
  codeVerifier: string
  expiresAt: number
}

interface DesktopCallback {
  flowId: string
  state: string
  code: string
}

let pendingAuthorization: PendingDesktopAuthorization | null = null

function randomBase64Url(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  const bytes = new Uint8Array(digest)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function parseDesktopCallback(value: string): DesktopCallback | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'safenode:' || url.hostname !== 'auth' || url.pathname !== '/callback') {
      return null
    }

    const flowId = url.searchParams.get('flow') || ''
    const state = url.searchParams.get('state') || ''
    const code = url.searchParams.get('code') || ''
    const valid = [flowId, state, code].every((item) => /^[A-Za-z0-9_-]{43,128}$/.test(item))
    return valid ? { flowId, state, code } : null
  } catch {
    return null
  }
}

export async function beginDesktopAuthorization(): Promise<void> {
  if (!isTauri()) throw new Error('Desktop authorization is only available in the installed app.')

  const state = randomBase64Url()
  const codeVerifier = randomBase64Url()
  const codeChallenge = await sha256Base64Url(codeVerifier)
  const response = await fetch(`${API_BASE}/api/desktop-auth/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': getCurrentDeviceId(),
    },
    credentials: 'omit',
    body: JSON.stringify({ state, codeChallenge }),
  })
  const data = await response.json().catch(() => ({ message: 'Failed to begin desktop authorization.' }))
  if (!response.ok) throw new Error(data.message || 'Failed to begin desktop authorization.')

  pendingAuthorization = {
    flowId: data.flowId,
    state,
    codeVerifier,
    expiresAt: data.expiresAt,
  }

  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(data.browserUrl)
  } catch (error) {
    pendingAuthorization = null
    throw error
  }
}

async function exchangeDesktopCallback(value: string): Promise<AuthResponse> {
  const callback = parseDesktopCallback(value)
  const pending = pendingAuthorization
  if (!callback) throw new Error('Safenode received an invalid desktop callback.')
  if (!pending) throw new Error('This desktop authorization was not started by the current app session. Start again.')
  if (
    pending.expiresAt <= Date.now() ||
    callback.flowId !== pending.flowId ||
    callback.state !== pending.state
  ) {
    pendingAuthorization = null
    throw new Error('Desktop authorization expired or did not match this app session.')
  }

  const response = await fetch(`${API_BASE}/api/desktop-auth/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': getCurrentDeviceId(),
    },
    credentials: 'omit',
    body: JSON.stringify({
      flowId: callback.flowId,
      state: callback.state,
      code: callback.code,
      codeVerifier: pending.codeVerifier,
    }),
  })
  const data = await response.json().catch(() => ({ message: 'Failed to finish desktop authorization.' }))
  if (!response.ok) {
    pendingAuthorization = null
    throw new Error(data.message || 'Failed to finish desktop authorization.')
  }

  pendingAuthorization = null
  return data as AuthResponse
}

export async function listenForDesktopAuthorization(
  onSuccess: (result: AuthResponse) => void,
  onError: (error: Error) => void,
): Promise<() => void> {
  if (!isTauri()) return () => undefined

  const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
  let processing = false
  const handleUrls = async (urls: string[]) => {
    if (processing) return
    const callbackUrl = urls.find((url) => parseDesktopCallback(url))
    if (!callbackUrl) return
    processing = true
    try {
      onSuccess(await exchangeDesktopCallback(callbackUrl))
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Desktop authorization failed.'))
    } finally {
      processing = false
    }
  }

  const unlistenOpenUrl = await onOpenUrl((urls) => { void handleUrls(urls) })

  // Windows/Linux: a deep link to an already-running instance arrives via the
  // single-instance handler (argv), which the Rust side forwards as this event.
  // macOS is covered by onOpenUrl above; the `processing` guard prevents any
  // double-handling if both paths ever fire.
  const { listen } = await import('@tauri-apps/api/event')
  const unlistenArgv = await listen<string>('deep-link-received', (event) => {
    if (typeof event.payload === 'string') void handleUrls([event.payload])
  })

  const current = await getCurrent()
  if (current) void handleUrls(current)

  return () => {
    unlistenOpenUrl()
    unlistenArgv()
  }
}
