"use strict";
/**
 * Breach Controller
 * Proxies requests to HaveIBeenPwned API with caching and error handling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBreachRange = getBreachRange;
exports.getCacheStats = getCacheStats;
// Dynamic import for node-fetch (ESM-only, can't use static import with CommonJS)
const getFetch = async () => {
    const module = await Promise.resolve().then(() => __importStar(require('node-fetch')));
    return module.default;
};
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Maximum number of cached entries
/**
 * Cleans up expired cache entries
 */
function cleanCache() {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (entry.expiresAt < now) {
            cache.delete(key);
        }
    }
    // If cache is too large, remove oldest entries
    if (cache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
        const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
        for (const [key] of toRemove) {
            cache.delete(key);
        }
    }
}
/**
 * GET /api/breach/range/:prefix
 * Proxies request to HaveIBeenPwned range API with caching
 *
 * Ref: https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange
 */
async function getBreachRange(request, reply) {
    try {
        const { prefix } = request.params;
        // Validate prefix: exactly 5 hex characters
        if (!prefix || !/^([0-9A-Fa-f]{5})$/.test(prefix)) {
            return reply.code(400).send({
                error: 'invalid_prefix',
                message: 'Prefix must be exactly 5 hexadecimal characters'
            });
        }
        const upperPrefix = prefix.toUpperCase();
        const cacheKey = `breach:${upperPrefix}`;
        // Check cache first
        cleanCache();
        const cached = cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            reply.header('Content-Type', 'text/plain; charset=utf-8');
            reply.header('X-Cache', 'HIT');
            return reply.send(cached.data);
        }
        // Fetch from HIBP API
        const url = `https://api.pwnedpasswords.com/range/${upperPrefix}`;
        let response;
        try {
            const fetch = await getFetch();
            response = await fetch(url, {
                headers: {
                    // Per HIBP guidelines
                    'Add-Padding': 'true',
                    'User-Agent': 'SafeNode/1.0 (https://safenode.app)'
                },
                // 10 second timeout
                signal: AbortSignal.timeout(10000)
            });
        }
        catch (fetchError) {
            request.log.error({ error: fetchError, prefix: upperPrefix }, 'HIBP fetch error');
            return reply.code(502).send({
                error: 'hibp_connection_error',
                message: 'Failed to connect to HaveIBeenPwned API',
                details: fetchError?.message || 'Connection timeout or network error'
            });
        }
        if (!response.ok) {
            request.log.warn({ status: response.status, prefix: upperPrefix }, 'HIBP returned error');
            return reply.code(502).send({
                error: 'hibp_upstream_error',
                status: response.status,
                message: 'HaveIBeenPwned API returned an error',
                details: `HTTP ${response.status} ${response.statusText}`
            });
        }
        // Read response text
        let text;
        try {
            text = await response.text();
        }
        catch (textError) {
            request.log.error({ error: textError, prefix: upperPrefix }, 'HIBP text read error');
            return reply.code(502).send({
                error: 'hibp_response_error',
                message: 'Failed to read response from HaveIBeenPwned API',
                details: textError?.message
            });
        }
        // Cache the response
        cache.set(cacheKey, {
            data: text,
            expiresAt: Date.now() + CACHE_TTL_MS
        });
        // Return raw text (suffix:count per line)
        reply.header('Content-Type', 'text/plain; charset=utf-8');
        reply.header('X-Cache', 'MISS');
        return reply.send(text);
    }
    catch (error) {
        request.log.error({ error, prefix: request.params.prefix }, 'Breach range endpoint error');
        return reply.code(500).send({
            error: error?.message || 'server_error',
            message: 'An unexpected error occurred while checking password breach'
        });
    }
}
/**
 * GET /api/breach/cache/stats
 * Returns cache statistics (for monitoring)
 */
async function getCacheStats(request, reply) {
    try {
        cleanCache();
        return {
            size: cache.size,
            maxSize: MAX_CACHE_SIZE,
            ttlMinutes: CACHE_TTL_MS / 60000
        };
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            error: error?.message || 'server_error',
            message: 'Failed to get cache stats'
        });
    }
}
