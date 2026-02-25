/**
 * Breach Controller
 * Proxies requests to HaveIBeenPwned API with caching and error handling
 */

import { FastifyRequest, FastifyReply } from 'fastify'

function getFetch(): typeof globalThis.fetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Global fetch is unavailable. Use Node.js 18+ runtime.')
  }
  return globalThis.fetch.bind(globalThis)
}

// Simple in-memory LRU cache with TTL
interface CacheEntry {
  data: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 1000 // Maximum number of cached entries

/**
 * Cleans up expired cache entries
 */
function cleanCache() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key)
    }
  }
  
  // If cache is too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt)
    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE)
    for (const [key] of toRemove) {
      cache.delete(key)
    }
  }
}

/**
 * GET /api/breach/range/:prefix
 * Proxies request to HaveIBeenPwned range API with caching
 * 
 * Ref: https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange
 */
export async function getBreachRange(
  request: FastifyRequest<{ Params: { prefix: string } }>,
  reply: FastifyReply
) {
  try {
    const { prefix } = request.params

    // Validate prefix: exactly 5 hex characters
    if (!prefix || !/^([0-9A-Fa-f]{5})$/.test(prefix)) {
      return reply.code(400).send({
        error: 'invalid_prefix',
        message: 'Prefix must be exactly 5 hexadecimal characters'
      })
    }

    const upperPrefix = prefix.toUpperCase()
    const cacheKey = `breach:${upperPrefix}`

    // Check cache first
    cleanCache()
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      reply.header('Content-Type', 'text/plain; charset=utf-8')
      reply.header('X-Cache', 'HIT')
      return reply.send(cached.data)
    }

    // Fetch from HIBP API
    const url = `https://api.pwnedpasswords.com/range/${upperPrefix}`
    
    let response
    try {
      const fetch = getFetch()
      response = await fetch(url, {
        headers: {
          // Per HIBP guidelines
          'Add-Padding': 'true',
          'User-Agent': 'SafeNode/1.0 (https://safe-node.app)'
        },
        // 10 second timeout
        signal: AbortSignal.timeout(10000)
      })
    } catch (fetchError: any) {
      request.log.error({ error: fetchError, prefix: upperPrefix }, 'HIBP fetch error')
      return reply.code(502).send({
        error: 'hibp_connection_error',
        message: 'Failed to connect to HaveIBeenPwned API',
        details: fetchError?.message || 'Connection timeout or network error'
      })
    }

    if (!response.ok) {
      request.log.warn({ status: response.status, prefix: upperPrefix }, 'HIBP returned error')
      return reply.code(502).send({
        error: 'hibp_upstream_error',
        status: response.status,
        message: 'HaveIBeenPwned API returned an error',
        details: `HTTP ${response.status} ${response.statusText}`
      })
    }

    // Read response text
    let text
    try {
      text = await response.text()
    } catch (textError: any) {
      request.log.error({ error: textError, prefix: upperPrefix }, 'HIBP text read error')
      return reply.code(502).send({
        error: 'hibp_response_error',
        message: 'Failed to read response from HaveIBeenPwned API',
        details: textError?.message
      })
    }

    // Cache the response
    cache.set(cacheKey, {
      data: text,
      expiresAt: Date.now() + CACHE_TTL_MS
    })

    // Return raw text (suffix:count per line)
    reply.header('Content-Type', 'text/plain; charset=utf-8')
    reply.header('X-Cache', 'MISS')
    return reply.send(text)
  } catch (error: any) {
    request.log.error({ error, prefix: request.params.prefix }, 'Breach range endpoint error')
    return reply.code(500).send({
      error: error?.message || 'server_error',
      message: 'An unexpected error occurred while checking password breach'
    })
  }
}

/**
 * GET /api/breach/cache/stats
 * Returns cache statistics (for monitoring)
 */
export async function getCacheStats(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    cleanCache()
    return {
      size: cache.size,
      maxSize: MAX_CACHE_SIZE,
      ttlMinutes: CACHE_TTL_MS / 60000
    }
  } catch (error: any) {
    request.log.error(error)
    return reply.code(500).send({
      error: error?.message || 'server_error',
      message: 'Failed to get cache stats'
    })
  }
}
