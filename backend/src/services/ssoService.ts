/**
 * SSO Service
 * Handles Enterprise SSO integrations (SAML, OAuth2/OIDC)
 * Supports Google, Microsoft, GitHub, Apple, and generic SAML providers
 */

import { randomBytes, createHash } from 'crypto'
import jwt from 'jsonwebtoken'
import { db } from './database'
import { createUser } from './userService'
import { issueToken } from '../middleware/auth'
import { createDeviceSession } from './deviceSessionService'
import type { User } from '../models/User'

function getFetch(): typeof globalThis.fetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Global fetch is unavailable. Use Node.js 18+ runtime.')
  }
  return globalThis.fetch.bind(globalThis)
}

export interface SSOProvider {
  id: string
  name: string
  type: 'saml' | 'oauth' | 'oidc'
  enabled: boolean
  config?: Record<string, any>
}

export interface SSOConfig {
  google?: {
    clientId: string
    clientSecret: string
  }
  microsoft?: {
    clientId: string
    clientSecret: string
    tenantId?: string
  }
  github?: {
    clientId: string
    clientSecret: string
  }
  apple?: {
    clientId: string
    teamId: string
    keyId: string
    privateKey: string
  }
  okta?: {
    clientId: string
    clientSecret: string
    domain: string
  }
  saml?: {
    entityId: string
    ssoUrl: string
    x509Cert: string
    nameIdFormat?: string
  }
}

// In-memory state storage for OAuth flows (use Redis in production)
const oauthStates = new Map<string, { provider: string; redirectUri: string; frontendRedirectUri?: string; createdAt: number }>()

// Provider configurations
const PROVIDER_CONFIGS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile']
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'email', 'profile', 'User.Read']
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email']
  },
  apple: {
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scopes: ['name', 'email']
  }
}

interface AppleCallbackUser {
  email?: string
  name?: {
    firstName?: string
    lastName?: string
  }
}

function getApplePrivateKey(privateKey: string): string {
  return privateKey.includes('-----BEGIN')
    ? privateKey.replace(/\\n/g, '\n')
    : privateKey.replace(/\\n/g, '\n')
}

function createAppleClientSecret(config: NonNullable<SSOConfig['apple']>): string {
  const now = Math.floor(Date.now() / 1000)

  return jwt.sign(
    {
      iss: config.teamId,
      iat: now,
      exp: now + 60 * 60 * 24 * 180,
      aud: 'https://appleid.apple.com',
      sub: config.clientId
    },
    getApplePrivateKey(config.privateKey),
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: config.keyId
      }
    }
  )
}

function parseAppleIdentityToken(idToken: string, clientId: string): { sub: string; email?: string; email_verified?: boolean | string; iss?: string; aud?: string | string[]; exp?: number } {
  const decoded = jwt.decode(idToken)

  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Invalid Apple identity token')
  }

  const payload = decoded as Record<string, any>
  const issuer = payload.iss
  const audience = payload.aud
  const expiry = typeof payload.exp === 'number' ? payload.exp : 0
  const audienceMatches = Array.isArray(audience) ? audience.includes(clientId) : audience === clientId

  if (issuer !== 'https://appleid.apple.com') {
    throw new Error('Apple identity token issuer mismatch')
  }

  if (!audienceMatches) {
    throw new Error('Apple identity token audience mismatch')
  }

  if (!expiry || expiry * 1000 <= Date.now()) {
    throw new Error('Apple identity token expired')
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Apple identity token missing subject')
  }

  return payload as any
}

/**
 * Generate a secure random state for OAuth flow
 */
function generateState(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

/**
 * Get SSO login URL for OAuth2 providers
 * @param provider - OAuth provider name
 * @param oauthRedirectUri - Backend callback URL (what OAuth provider needs)
 * @param frontendRedirectUri - Frontend redirect URI (stored in state for final redirect)
 * @param config - SSO configuration
 */
export async function getSSOLoginUrl(
  provider: 'google' | 'microsoft' | 'github' | 'apple' | 'okta' | 'saml',
  oauthRedirectUri: string,
  frontendRedirectUri: string | undefined,
  config: SSOConfig
): Promise<string> {
  const state = generateState()
  const { codeVerifier, codeChallenge } = generatePKCE()
  
  // Store state with verifier (use Redis in production)
  // OAuth redirect URI is what the provider needs, frontend redirect URI is for final redirect
  oauthStates.set(state, {
    provider,
    redirectUri: oauthRedirectUri, // Backend callback URL for OAuth
    frontendRedirectUri, // Frontend URL for final redirect
    createdAt: Date.now()
  })
  ;(oauthStates as any).verifiers = (oauthStates as any).verifiers || new Map()
  ;(oauthStates as any).verifiers.set(state, codeVerifier)

  const providerConfig = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS]
  if (!providerConfig) {
    throw new Error(`Provider ${provider} not supported`)
  }

  const providerConfigObj = config[provider as keyof SSOConfig]
  if (!providerConfigObj || !('clientId' in providerConfigObj)) {
    throw new Error(`Configuration missing for provider ${provider}`)
  }

  const clientId = (providerConfigObj as { clientId: string }).clientId
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthRedirectUri, // Use backend callback URL for OAuth
    response_type: 'code',
    scope: providerConfig.scopes.join(' '),
    state
  })

  if (provider !== 'apple') {
    params.set('code_challenge', codeChallenge)
    params.set('code_challenge_method', 'S256')
  } else {
    params.set('response_mode', 'form_post')
  }

  let authUrl = providerConfig.authUrl
  if (provider === 'microsoft' && 'tenantId' in providerConfigObj && providerConfigObj.tenantId) {
    authUrl = authUrl.replace('{tenant}', providerConfigObj.tenantId)
  } else if (provider === 'microsoft') {
    authUrl = authUrl.replace('{tenant}', 'common')
  }

  return `${authUrl}?${params.toString()}`
}

/**
 * Exchange OAuth code for access token and get user info
 */
async function exchangeCodeForToken(
  provider: 'google' | 'microsoft' | 'github' | 'apple',
  code: string,
  redirectUri: string,
  config: SSOConfig,
  codeVerifier?: string,
  profileHint?: AppleCallbackUser
): Promise<{ accessToken: string; userInfo: any }> {
  const providerConfig = PROVIDER_CONFIGS[provider] as any
  const providerConfigObj = config[provider as keyof SSOConfig] as any
  
  if (!providerConfigObj || !providerConfigObj.clientId || !providerConfigObj.clientSecret) {
    throw new Error(`Configuration missing for provider ${provider}`)
  }

  let tokenUrl = providerConfig.tokenUrl
  if (provider === 'microsoft' && providerConfigObj.tenantId) {
    tokenUrl = tokenUrl.replace('{tenant}', providerConfigObj.tenantId)
  } else if (provider === 'microsoft') {
    tokenUrl = tokenUrl.replace('{tenant}', 'common')
  }

  const tokenParams: any = {
    client_id: providerConfigObj.clientId,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  }

  if (provider === 'apple') {
    tokenParams.client_secret = createAppleClientSecret(providerConfigObj)
  } else {
    tokenParams.client_secret = providerConfigObj.clientSecret
  }

  // Add PKCE code verifier if available (required for PKCE flow)
  if (codeVerifier && provider !== 'apple') {
    tokenParams.code_verifier = codeVerifier
  }

  if (provider === 'github') {
    tokenParams.client_secret = providerConfigObj.clientSecret
  }

  const fetchFn = getFetch()
  const tokenResponse = await fetchFn(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams(tokenParams).toString()
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`)
  }

  const tokenData = await tokenResponse.json() as any
  const accessToken = tokenData.access_token

  if (!accessToken && provider !== 'apple') {
    throw new Error('No access token received')
  }

  if (provider === 'apple') {
    if (!tokenData.id_token) {
      throw new Error('No Apple identity token received')
    }

    const appleClaims = parseAppleIdentityToken(tokenData.id_token, providerConfigObj.clientId)
    const displayName = [profileHint?.name?.firstName, profileHint?.name?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim()

    const normalizedAppleUser = {
      email: appleClaims.email || profileHint?.email,
      name: displayName || (appleClaims.email ? appleClaims.email.split('@')[0] : 'Apple User'),
      id: appleClaims.sub
    }

    if (!normalizedAppleUser.email) {
      throw new Error('Apple did not return an email address for this account')
    }

    return {
      accessToken: accessToken || tokenData.id_token,
      userInfo: normalizedAppleUser
    }
  }

  // Fetch user info
  let userInfoUrl = providerConfig.userInfoUrl
  if (provider === 'github') {
    userInfoUrl = providerConfig.userInfoUrl
  }

  const userInfoResponse = await fetchFn(userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  })

  if (!userInfoResponse.ok) {
    throw new Error(`Failed to fetch user info: ${userInfoResponse.status}`)
  }

  const userInfo = await userInfoResponse.json() as any

  // Normalize user info across providers
  let normalizedUserInfo: { email: string; name: string; id: string }
  
  if (provider === 'google') {
    normalizedUserInfo = {
      email: userInfo.email as string,
      name: (userInfo.name || userInfo.given_name || '') as string,
      id: userInfo.id as string
    }
  } else if (provider === 'microsoft') {
    normalizedUserInfo = {
      email: userInfo.mail || userInfo.userPrincipalName,
      name: userInfo.displayName || userInfo.givenName || '',
      id: userInfo.id
    }
  } else if (provider === 'github') {
    // GitHub requires separate email endpoint
    const emailResponse = await fetchFn('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })
    const emails = await emailResponse.json() as any[]
    const primaryEmail = emails.find(e => e.primary) || emails[0]
    
    normalizedUserInfo = {
      email: primaryEmail.email,
      name: userInfo.name || userInfo.login,
      id: userInfo.id.toString()
    }
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }

  return { accessToken, userInfo: normalizedUserInfo }
}

/**
 * Handle SSO callback and create/link user account
 */
export async function handleSSOCallback(
  provider: 'google' | 'microsoft' | 'github' | 'apple' | 'okta' | 'saml',
  code: string,
  state: string,
  config: SSOConfig,
  profileHint?: AppleCallbackUser,
  sessionContext?: {
    deviceId?: string | null
    ipAddress?: string
    userAgent?: string
  }
): Promise<{ user: User; token: string }> {
  // Verify state
  const storedState = oauthStates.get(state)
  if (!storedState) {
    throw new Error('Invalid or expired OAuth state')
  }

  // Clean up expired states (older than 10 minutes)
  const now = Date.now()
  if (now - storedState.createdAt > 10 * 60 * 1000) {
    oauthStates.delete(state)
    if ((oauthStates as any).verifiers) {
      (oauthStates as any).verifiers.delete(state)
    }
    throw new Error('OAuth state expired')
  }

  if (storedState.provider !== provider) {
    throw new Error('Provider mismatch in OAuth state')
  }

  const redirectUri = storedState.redirectUri
  const codeVerifier = (oauthStates as any).verifiers?.get(state)

  // Handle OAuth providers
  if (provider === 'google' || provider === 'microsoft' || provider === 'github' || provider === 'apple') {
    const { userInfo } = await exchangeCodeForToken(provider, code, redirectUri, config, codeVerifier, profileHint)
    
    // Check if user exists by email
    let user = await db.users.findByEmail(userInfo.email.toLowerCase().trim())
    
    if (!user) {
      // Create new user account
      user = await createUser({
        email: userInfo.email,
        password: randomBytes(32).toString('hex'), // Random password, SSO users don't need it
        displayName: userInfo.name
      })
      
      // Mark email as verified (SSO emails are verified)
      await db.users.update(user.id, {
        emailVerified: true
      })
    } else {
      // Update last login
      await db.users.update(user.id, {
        lastLoginAt: Date.now()
      })
    }

    const session = await createDeviceSession({
      userId: user.id,
      deviceId: sessionContext?.deviceId,
      ipAddress: sessionContext?.ipAddress,
      userAgent: sessionContext?.userAgent
    })

    // Generate JWT token with tokenVersion
    const token = issueToken({
      id: user.id,
      email: user.email,
      tokenVersion: (user as any).tokenVersion || 1,
      sessionId: session.id
    })

    // Clean up state and verifier
    oauthStates.delete(state)
    if ((oauthStates as any).verifiers) {
      (oauthStates as any).verifiers.delete(state)
    }

    return { user, token }
  }

  // SAML handling (Okta, Azure AD SAML, Generic SAML)
  if (provider === 'saml' || provider === 'okta') {
    // SAML callback handling
    // Note: SAML typically uses POST with SAMLResponse and RelayState
    // For Okta, the flow is similar to SAML but with Okta-specific endpoints
    
    // In a real implementation, you would:
    // 1. Parse the SAMLResponse XML
    // 2. Verify the SAML assertion signature using the X.509 certificate
    // 3. Extract user attributes (email, name) from the assertion
    // 4. Create or link user account
    
    // For now, return a structured error indicating SAML needs to be configured
    if (!config.saml?.ssoUrl || !config.saml?.x509Cert) {
      throw new Error('SAML provider is not fully configured. SSO URL and X.509 certificate are required.')
    }
    
    // Placeholder for SAML assertion parsing
    // In production, use a library like `saml2-js` or `passport-saml`
    throw new Error('SAML/Okta SSO implementation requires saml2-js or similar library. Install and configure: npm install saml2-js')
  }

  throw new Error(`Unsupported provider: ${provider}`)
}

/**
 * Initialize SSO provider configuration
 */
export async function initializeSSOProvider(
  provider: 'google' | 'microsoft' | 'github' | 'apple' | 'okta' | 'saml',
  config: any
): Promise<SSOProvider> {
  // Validate configuration based on provider
  if (provider === 'google' || provider === 'microsoft' || provider === 'github') {
    if (!config.clientId || !config.clientSecret) {
      throw new Error(`${provider} requires clientId and clientSecret`)
    }
  } else if (provider === 'apple') {
    if (!config.clientId || !config.teamId || !config.keyId || !config.privateKey) {
      throw new Error('apple requires clientId, teamId, keyId, and privateKey')
    }
  } else if (provider === 'saml') {
    if (!config.entityId || !config.ssoUrl || !config.x509Cert) {
      throw new Error('SAML requires entityId, ssoUrl, and x509Cert')
    }
  }

  return {
    id: `sso-${provider}-${Date.now()}`,
    name: provider === 'saml' ? 'SAML Provider' : `${provider.charAt(0).toUpperCase() + provider.slice(1)} SSO`,
    type: provider === 'saml' ? 'saml' : 'oauth',
    enabled: true,
    config
  }
}

/**
 * Clean up expired OAuth states (call periodically)
 */
export function cleanupExpiredStates(): void {
  const now = Date.now()
  const maxAge = 10 * 60 * 1000 // 10 minutes

  for (const [state, data] of oauthStates.entries()) {
    if (now - data.createdAt > maxAge) {
      oauthStates.delete(state)
      if ((oauthStates as any).verifiers) {
        (oauthStates as any).verifiers.delete(state)
      }
    }
  }
}

/**
 * Get frontend redirect URI from stored state
 */
export function getStoredFrontendRedirectUri(state: string): string | null {
  const storedState = oauthStates.get(state)
  return storedState?.frontendRedirectUri || null
}

// Clean up expired states every 5 minutes
setInterval(cleanupExpiredStates, 5 * 60 * 1000)
