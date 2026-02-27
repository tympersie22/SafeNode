/**
 * Billing Service
 * Handles backend-driven billing operations (Stripe-compatible endpoint)
 */
import { API_BASE } from '../config/api'

export interface SubscriptionLimits {
  devices: { allowed: boolean; current: number; limit: number }
  vaults: { allowed: boolean; current: number; limit: number }
  teamMembers: { allowed: boolean; current: number; limit: number }
  storage: { allowed: boolean; current: number; limit: number }
}

export interface CheckoutSession {
  sessionId: string
  url: string
}

/**
 * Create hosted checkout session via backend billing provider
 */
export async function createCheckoutSession(
  priceId: string,
  successUrl: string = `${window.location.origin}/billing/success`,
  cancelUrl: string = `${window.location.origin}/billing/cancel`
): Promise<CheckoutSession> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/billing/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      priceId,
      successUrl,
      cancelUrl
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create checkout session' }))
    throw new Error(error.message || 'Failed to create checkout session')
  }

  const data = await response.json()
  
  // Handle both response formats: { success, sessionId, url } or { sessionId, url }
  if (data.success && data.url) {
    return {
      sessionId: data.sessionId,
      url: data.url
    }
  }
  
  // If already in correct format, return as-is
  if (data.url) {
    return data
  }
  
  throw new Error('Invalid response format from server')
}

/**
 * Create Stripe customer portal session
 */
export async function createPortalSession(
  returnUrl: string = `${window.location.origin}/settings/billing`
): Promise<{ url: string }> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/billing/portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      returnUrl
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create portal session')
  }

  const data = await response.json()
  return data
}

/**
 * Get subscription limits
 */
export async function getSubscriptionLimits(
  resource?: 'devices' | 'vaults' | 'teamMembers' | 'storage'
): Promise<SubscriptionLimits | { resource: string; allowed: boolean; current: number; limit: number }> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const url = resource
    ? `${API_BASE}/api/billing/limits?resource=${resource}`
    : `${API_BASE}/api/billing/limits`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch subscription limits')
  }

  return await response.json()
}

/**
 * Check if a specific resource limit allows action
 */
export async function checkResourceLimit(
  resource: 'devices' | 'vaults' | 'teamMembers' | 'storage'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = await getSubscriptionLimits(resource) as any
  return {
    allowed: limits.allowed,
    current: limits.current,
    limit: limits.limit
  }
}
