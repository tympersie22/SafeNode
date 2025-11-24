/**
 * Sentry Service
 * Error tracking and monitoring for frontend
 * 
 * Environment Variables:
 * - VITE_SENTRY_DSN: Your Sentry DSN
 * - VITE_SENTRY_ENV: Environment name (defaults to MODE)
 * 
 * To enable Sentry:
 * 1. Install: npm install --save @sentry/react @sentry/tracing
 * 2. Set VITE_SENTRY_DSN in your .env file
 */

// Direct import - Vite will resolve these at build time
import * as Sentry from '@sentry/react'
// Note: BrowserTracing removed due to version mismatch
// Performance monitoring can be added later when packages are aligned

let isInitialized = false

/**
 * Initialize Sentry for frontend
 */
export function initSentry(): void {
  if (isInitialized) return

  // Access env variables (Vite provides these)
  const dsn = import.meta.env.VITE_SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN_FRONTEND
  const environment = import.meta.env.VITE_SENTRY_ENV || import.meta.env.MODE || 'development'

  if (!dsn && environment === 'production') {
    console.warn('⚠️  Sentry DSN not configured. Error tracking will not work in production.')
    return
  }

  if (!dsn) {
    // Skip initialization in development if DSN not provided
    return
  }

  try {
    const integrations: any[] = []
    
    // BrowserTracing removed temporarily due to package version mismatch
    // Performance monitoring can be re-enabled when @sentry/tracing is updated

    Sentry.init({
      dsn,
      environment,
      integrations,
      
      // Performance Monitoring
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% of transactions
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      
      // Filter out noise
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        // Network errors
        'NetworkError',
        'Network request failed',
        // Known issues
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured'
      ],
      
      // Configure what data to send
      beforeSend(event: any, hint: any) {
        // Don't send events in development unless explicitly enabled
        if (environment === 'development' && !import.meta.env.VITE_SENTRY_ENABLED_IN_DEV) {
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
        
        // Don't capture errors from browser extensions
        if (event.exception) {
          const error = hint.originalException
          if (error && typeof error === 'object' && 'message' in error) {
            const message = String(error.message)
            if (
              message.includes('chrome-extension://') ||
              message.includes('moz-extension://') ||
              message.includes('safari-extension://')
            ) {
              return null
            }
          }
        }
        
        return event
      }
    })

    isInitialized = true
    console.log('✅ Sentry initialized for frontend')
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error)
    // Continue without Sentry - app should still work
  }
}

/**
 * Capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!isInitialized) return
  
  try {
    Sentry.withScope((scope: any) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value)
        })
      }
      Sentry.captureException(error)
    })
  } catch (err) {
    // Silently fail if Sentry is not available
  }
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' | 'debug' | 'fatal' = 'info'): void {
  if (!isInitialized) return
  
  try {
    Sentry.captureMessage(message, level)
  } catch (err) {
    // Silently fail if Sentry is not available
  }
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  if (!isInitialized) return
  
  try {
    Sentry.setUser(user)
  } catch (err) {
    // Silently fail if Sentry is not available
  }
}

/**
 * Clear user context
 */
export function clearUser(): void {
  if (!isInitialized) return
  
  try {
    Sentry.setUser(null)
  } catch (err) {
    // Silently fail if Sentry is not available
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
  if (!isInitialized) return
  
  try {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info'
    })
  } catch (err) {
    // Silently fail if Sentry is not available
  }
}
