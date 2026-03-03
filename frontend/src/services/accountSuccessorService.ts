import { API_BASE } from '../config/api'
import { getAuthHeader, setToken } from './authService'
import { getCurrentDeviceId } from './deviceService'

export interface AccountSuccessor {
  ownerUserId: string
  successorEmail: string
  successorName?: string | null
  relationshipLabel?: string | null
  note?: string | null
  waitingPeriodDays: number
  status: 'active' | 'claim_pending' | 'revoked' | 'transferred' | string
  claimRequestedAt?: string | null
  claimAvailableAt?: string | null
  claimedAt?: string | null
  createdAt: string
  updatedAt: string
}

async function parseError(response: Response, fallback: string): Promise<Error> {
  const error = await response.json().catch(() => ({ message: fallback }))
  return new Error(error.message || fallback)
}

export async function getAccountSuccessor(): Promise<AccountSuccessor | null> {
  const response = await fetch(`${API_BASE}/api/account/successor`, {
    headers: {
      'Authorization': getAuthHeader() || '',
      'X-Device-ID': getCurrentDeviceId()
    }
  })

  if (!response.ok) {
    throw await parseError(response, 'Failed to load successor settings')
  }

  const data = await response.json()
  return data.successor || null
}

export async function saveAccountSuccessor(payload: {
  successorEmail: string
  successorName?: string
  relationshipLabel?: string
  note?: string
  waitingPeriodDays?: number
}): Promise<AccountSuccessor> {
  const response = await fetch(`${API_BASE}/api/account/successor`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader() || '',
      'X-Device-ID': getCurrentDeviceId()
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw await parseError(response, 'Failed to save successor settings')
  }

  const data = await response.json()
  return data.successor
}

export async function revokeAccountSuccessor(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/account/successor`, {
    method: 'DELETE',
    headers: {
      'Authorization': getAuthHeader() || '',
      'X-Device-ID': getCurrentDeviceId()
    }
  })

  if (!response.ok) {
    throw await parseError(response, 'Failed to revoke successor settings')
  }
}

export async function cancelAccountSuccessorClaim(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/account/successor/cancel-claim`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader() || '',
      'X-Device-ID': getCurrentDeviceId()
    }
  })

  if (!response.ok) {
    throw await parseError(response, 'Failed to cancel succession claim')
  }
}

export async function requestAccountSuccessorClaim(payload: {
  ownerEmail: string
  successorEmail: string
}): Promise<{ claimAvailableAt: string; message: string }> {
  const response = await fetch(`${API_BASE}/api/account/successor/claim/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw await parseError(response, 'Failed to start succession claim')
  }

  return response.json()
}

export async function getAccountSuccessorClaimStatus(token: string): Promise<{
  ownerEmail: string
  successorEmail: string
  successorName?: string | null
  relationshipLabel?: string | null
  status: 'waiting' | 'ready'
  claimAvailableAt?: string
  message: string
}> {
  const response = await fetch(`${API_BASE}/api/account/successor/claim/status?token=${encodeURIComponent(token)}`)

  if (!response.ok) {
    throw await parseError(response, 'Failed to load succession claim')
  }

  return response.json()
}

export async function completeAccountSuccessorClaim(payload: {
  token: string
  password: string
  displayName?: string
}): Promise<any> {
  const response = await fetch(`${API_BASE}/api/account/successor/claim/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID': getCurrentDeviceId()
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw await parseError(response, 'Failed to complete succession claim')
  }

  const data = await response.json()
  if (data?.token) {
    setToken(data.token)
  }
  return data
}
