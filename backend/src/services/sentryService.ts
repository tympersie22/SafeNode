/**
 * Sentry Service
 * Error tracking and monitoring for production
 * Note: Install @sentry/node and @sentry/profiling-node to enable error tracking
 */

let Sentry: any = null
let ProfilingIntegration: any = null
let isInitialized = false

// Try to import Sentry, but don't fail if not installed
try {
  Sentry = require('@sentry/node')
  ProfilingIntegration = require('@sentry/profiling-node').ProfilingIntegration
} catch {
  // Sentry not installed, will skip initialization
  console.warn('⚠️  @sentry/node not installed. Error tracking is disabled.')
}

import { config } from '../config'

/**
 * Initialize Sentry for backend
 */
export function initSentry(): void {
  if (isInitialized) return

  // Skip if Sentry is not installed
  if (!Sentry) {
    return
  }

  const dsn = process.env.SENTRY_DSN || process.env.SENTRY_DSN_BACKEND

  if (!dsn && config.nodeEnv === 'production') {
    console.warn('⚠️  Sentry DSN not configured. Error tracking will not work in production.')
    return
  }

  if (!dsn) {
    // Skip initialization in development if DSN not provided
    return
  }

  try {
    Sentry.init({
      dsn,
      environment: config.nodeEnv,
      integrations: [
        // Automatically instrument Node.js libraries and frameworks
        new (Sentry as any).Integrations.Http({ tracing: true }),
        new (Sentry as any).Integrations.Express({ app: undefined as any }), // Will be set later
        ProfilingIntegration ? new ProfilingIntegration() : undefined
      ].filter(Boolean),
      // Performance Monitoring
      tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0, // 10% of transactions in prod
      profilesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0, // 10% of profiles in prod
      
      // Release tracking
      release: process.env.npm_package_version || 'unknown',
      
      // Filter out health checks and noise
      ignoreErrors: [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND'
      ],
      
      // Configure what data to send
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (config.nodeEnv === 'development' && !process.env.SENTRY_ENABLED_IN_DEV) {
          return null
        }
        
        // Filter sensitive data
        if (event.request) {
          // Remove sensitive headers
          if (event.request.headers) {
            delete event.request.headers.authorization
            delete event.request.headers.cookie
          }
          
          // Remove sensitive query params
          if (event.request.query_string) {
            const query = new URLSearchParams(event.request.query_string)
            query.delete('password')
            query.delete('token')
            event.request.query_string = query.toString()
          }
        }
        
        return event
      }
    })

    isInitialized = true
    console.log('✅ Sentry initialized for backend')
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error)
  }
}

/**
 * Capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!isInitialized || !Sentry) return
  
  Sentry.withScope((scope: any) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value)
      })
    }
    Sentry.captureException(error)
  })
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' | 'debug' | 'fatal' = 'info'): void {
  if (!isInitialized || !Sentry) return
  Sentry.captureMessage(message, level)
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
  if (!isInitialized || !Sentry) return
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info'
  })
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  if (!isInitialized || !Sentry) return
  Sentry.setUser(user)
}

/**
 * Clear user context
 */
export function clearUser(): void {
  if (!isInitialized || !Sentry) return
  Sentry.setUser(null)
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): any {
  if (!isInitialized || !Sentry) return null
  return Sentry.startTransaction({ name, op })
}

