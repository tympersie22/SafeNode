/**
 * Security Middleware
 * Adds security headers and protection mechanisms
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import helmet from '@fastify/helmet'
import { randomBytes } from 'crypto'
import { config } from '../config'

/**
 * Generate a nonce for CSP
 */
function generateNonce(): string {
  return randomBytes(16).toString('base64')
}

/**
 * Register security headers with nonce-based CSP for production
 */
export async function registerSecurityHeaders(server: FastifyInstance): Promise<void> {
  // Generate nonce per request for CSP
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Generate nonce for this request
    const nonce = generateNonce()
    // Store nonce in request object for use in templates/headers
    ;(request as any).nonce = nonce
    // Add nonce to reply headers (can be used by frontend if needed)
    reply.header('X-CSP-Nonce', nonce)
  })

  // Get CORS origins for connectSrc
  const corsOrigins = Array.isArray(config.corsOrigin) 
    ? config.corsOrigin 
    : [config.corsOrigin as string]

  // Production CSP: strict, no unsafe-inline
  // Development CSP: allows unsafe-inline for Vite dev server
  // Note: Vite bundles all scripts in production, so no inline scripts needed
  const cspDirectives = config.nodeEnv === 'production' 
    ? {
        defaultSrc: ["'self'"],
        // Vite bundles all styles/scripts, no inline needed
        styleSrc: ["'self'", "'unsafe-inline'"], // Safe because Vite extracts all styles
        scriptSrc: [
          "'self'",
          'https://js.stripe.com', // Stripe.js
          'https://browser.sentry-cdn.com' // Sentry error tracking
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
          'https://images.unsplash.com', // If using images
          'https://*.stripe.com' // Stripe checkout images
        ],
        connectSrc: [
          "'self'",
          ...corsOrigins,
          'https://api.stripe.com',
          'https://checkout.stripe.com',
          'https://*.sentry.io', // Sentry error reporting
          'https://*.ingest.sentry.io', // Sentry data ingestion
          'https://vitals.vercel-insights.com' // Vercel analytics if used
        ],
        fontSrc: [
          "'self'",
          'data:',
          'https://fonts.gstatic.com',
          'https://fonts.googleapis.com'
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: [
          "'self'",
          'https://js.stripe.com',
          'https://hooks.stripe.com',
          'https://checkout.stripe.com'
        ],
        baseUri: ["'self'"],
        formAction: [
          "'self'",
          'https://checkout.stripe.com'
        ],
        upgradeInsecureRequests: []
      }
    : {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow for Vite dev server
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow for Vite dev server HMR
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'http://localhost:*',
          'ws://localhost:*',
          'https://api.stripe.com',
          'https://*.sentry.io'
        ],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", 'https://js.stripe.com'],
        baseUri: ["'self'"],
        formAction: ["'self'", 'https://checkout.stripe.com'],
        upgradeInsecureRequests: null
      }

  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: cspDirectives
    },
    crossOriginEmbedderPolicy: config.nodeEnv === 'production',
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: config.nodeEnv === 'production'
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true
  })
}

/**
 * Add custom security headers
 */
export function addCustomSecurityHeaders(server: FastifyInstance): void {
  server.addHook('onSend', async (request, reply, payload) => {
    // Security headers
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.header('Referrer-Policy', 'no-referrer')
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    
    // Remove server identification
    reply.removeHeader('X-Powered-By')
    
    return payload
  })
}

/**
 * CORS configuration for production
 */
export function configureCORS(server: FastifyInstance, allowedOrigins: string[]): void {
  server.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin
    
    if (origin && allowedOrigins.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin)
      reply.header('Access-Control-Allow-Credentials', 'true')
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      reply.header('Access-Control-Max-Age', '86400') // 24 hours
    }
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return reply.send()
    }
  })
}

