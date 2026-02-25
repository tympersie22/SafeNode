/**
 * SSO Routes
 * Enterprise SSO integration endpoints (SAML/OAuth2)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../middleware/auth'
import { 
  initializeSSOProvider, 
  getSSOLoginUrl, 
  handleSSOCallback 
} from '../services/ssoService'
import { z } from 'zod'
import { config } from '../config'

// SSO Configuration Schema
const SSOSetupSchema = z.object({
  provider: z.enum(['google', 'microsoft', 'github', 'okta', 'saml']),
  config: z.record(z.any())
})

// Get SSO config from environment or database
function getSSOConfig(): any {
  // In production, load from database. For now, use environment variables
  return {
    google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    } : undefined,
    microsoft: process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET ? {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common'
    } : undefined,
    github: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    } : undefined
  }
}

/**
 * Register SSO routes
 */
export async function registerSSORoutes(server: FastifyInstance) {
  /**
   * POST /api/sso/setup
   * Setup SSO provider (requires authentication - admin only in production)
   */
  server.post('/api/sso/setup', {
    preHandler: requireAuth
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = SSOSetupSchema.parse(request.body)
      
      const provider = await initializeSSOProvider(body.provider, body.config)
      
      return reply.send({
        success: true,
        provider
      })
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'validation_error',
          message: 'Invalid request body',
          details: error.errors
        })
      }
      
      request.log.error(error)
      return reply.code(500).send({
        error: 'setup_failed',
        message: error?.message || 'Failed to setup SSO provider'
      })
    }
  })

  /**
   * GET /api/sso/login/:provider
   * Initiate SSO login flow
   * Redirects user to OAuth provider
   */
  server.get('/api/sso/login/:provider', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { provider } = request.params as { provider: string }
      const { redirect_uri } = request.query as { redirect_uri?: string }

      if (!['google', 'microsoft', 'github', 'okta', 'saml'].includes(provider)) {
        return reply.code(400).send({
          error: 'invalid_provider',
          message: `Provider ${provider} is not supported. Supported: google, microsoft, github, okta, saml`
        })
      }

      if (!redirect_uri) {
        return reply.code(400).send({
          error: 'missing_redirect_uri',
          message: 'redirect_uri query parameter is required'
        })
      }

      const ssoConfig = getSSOConfig()
      if (!ssoConfig[provider as keyof typeof ssoConfig]) {
        return reply.code(400).send({
          error: 'provider_not_configured',
          message: `SSO provider ${provider} is not configured. Please set up provider credentials.`
        })
      }

      // Construct backend callback URL for OAuth provider
      // OAuth providers need the backend callback URL, not the frontend URL
      // In Vercel/production, use environment variable or detect from headers
      let backendCallbackUrl: string
      
      // Try to use explicit BACKEND_URL env var first (most reliable)
      if (process.env.BACKEND_URL) {
        backendCallbackUrl = `${process.env.BACKEND_URL}/api/sso/callback/${provider}`
      } else {
        // Fallback to constructing from request (works in Vercel)
        const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'https'
        const host = request.headers['host'] || request.hostname || process.env.VERCEL_URL || 'localhost:4000'
        backendCallbackUrl = `${protocol}://${host}/api/sso/callback/${provider}`
      }
      
      // Log the redirect URI for debugging (remove in production if sensitive)
      request.log.info({ 
        provider, 
        backendCallbackUrl, 
        frontendRedirectUri: redirect_uri 
      }, 'SSO login initiated')

      // Pass both: backend callback URL for OAuth, frontend redirect URI for final redirect
      const loginUrl = await getSSOLoginUrl(
        provider as 'google' | 'microsoft' | 'github' | 'okta' | 'saml',
        backendCallbackUrl, // OAuth redirect URI (backend callback)
        redirect_uri, // Frontend redirect URI (stored in state for later)
        ssoConfig
      )

      // Redirect to OAuth provider
      return reply.redirect(loginUrl)
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: 'sso_login_failed',
        message: error?.message || 'Failed to initiate SSO login'
      })
    }
  })

  /**
   * GET /api/sso/callback/:provider
   * Handle SSO callback after OAuth redirect
   * Creates or links user account and returns JWT token
   */
  server.get('/api/sso/callback/:provider', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { provider } = request.params as { provider: string }
      const { code, state, error, error_description } = request.query as {
        code?: string
        state?: string
        error?: string
        error_description?: string
      }

      if (!['google', 'microsoft', 'github', 'okta', 'saml'].includes(provider)) {
        return reply.code(400).send({
          error: 'invalid_provider',
          message: `Provider ${provider} is not supported`
        })
      }

      // Check for OAuth errors
      if (error) {
        return reply.code(400).send({
          error: 'oauth_error',
          message: error_description || error || 'OAuth authorization failed'
        })
      }

      if (!code || !state) {
        return reply.code(400).send({
          error: 'missing_parameters',
          message: 'code and state query parameters are required'
        })
      }

      const ssoConfig = getSSOConfig()
      const result = await handleSSOCallback(
        provider as 'google' | 'microsoft' | 'github' | 'okta' | 'saml',
        code,
        state,
        ssoConfig
      )

      // Get frontend redirect URI from state (stored during login initiation)
      const { getStoredFrontendRedirectUri } = await import('../services/ssoService')
      const frontendRedirectUri = getStoredFrontendRedirectUri(state) || 
        (config.nodeEnv === 'production' 
          ? process.env.FRONTEND_URL || 'https://safe-node.app'
          : 'http://localhost:5173') + '/auth/sso/callback'

      // Redirect to frontend with token
      const redirectUrl = new URL(frontendRedirectUri)
      redirectUrl.searchParams.set('token', result.token)
      redirectUrl.searchParams.set('user_id', result.user.id)

      return reply.redirect(redirectUrl.toString())
    } catch (error: any) {
      request.log.error(error)
      
      // Redirect to frontend error page
      const frontendUrl = config.nodeEnv === 'production'
        ? process.env.FRONTEND_URL || 'https://safe-node.app'
        : 'http://localhost:5173'
      
      const errorUrl = new URL(`${frontendUrl}/auth/sso/error`)
      errorUrl.searchParams.set('error', error?.message || 'SSO callback failed')

      return reply.redirect(errorUrl.toString())
    }
  })

  /**
   * GET /api/sso/providers
   * List available SSO providers (public endpoint)
   */
  server.get('/api/sso/providers', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ssoConfig = getSSOConfig()
      const providers = []

      if (ssoConfig.google) {
        providers.push({
          id: 'google',
          name: 'Google',
          type: 'oauth',
          enabled: true
        })
      }

      if (ssoConfig.microsoft) {
        providers.push({
          id: 'microsoft',
          name: 'Microsoft',
          type: 'oauth',
          enabled: true
        })
      }

      if (ssoConfig.github) {
        providers.push({
          id: 'github',
          name: 'GitHub',
          type: 'oauth',
          enabled: true
        })
      }

      return reply.send({
        success: true,
        providers
      })
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: 'failed_to_list_providers',
        message: error?.message || 'Failed to list SSO providers'
      })
    }
  })
}
