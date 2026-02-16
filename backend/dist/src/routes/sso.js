"use strict";
/**
 * SSO Routes
 * Enterprise SSO integration endpoints (SAML/OAuth2)
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
exports.registerSSORoutes = registerSSORoutes;
const auth_1 = require("../middleware/auth");
const ssoService_1 = require("../services/ssoService");
const zod_1 = require("zod");
const config_1 = require("../config");
// SSO Configuration Schema
const SSOSetupSchema = zod_1.z.object({
    provider: zod_1.z.enum(['google', 'microsoft', 'github', 'okta', 'saml']),
    config: zod_1.z.record(zod_1.z.any())
});
// Get SSO config from environment or database
function getSSOConfig() {
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
    };
}
/**
 * Register SSO routes
 */
async function registerSSORoutes(server) {
    /**
     * POST /api/sso/setup
     * Setup SSO provider (requires authentication - admin only in production)
     */
    server.post('/api/sso/setup', {
        preHandler: auth_1.requireAuth
    }, async (request, reply) => {
        try {
            const body = SSOSetupSchema.parse(request.body);
            const provider = await (0, ssoService_1.initializeSSOProvider)(body.provider, body.config);
            return reply.send({
                success: true,
                provider
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return reply.code(400).send({
                    error: 'validation_error',
                    message: 'Invalid request body',
                    details: error.errors
                });
            }
            request.log.error(error);
            return reply.code(500).send({
                error: 'setup_failed',
                message: error?.message || 'Failed to setup SSO provider'
            });
        }
    });
    /**
     * GET /api/sso/login/:provider
     * Initiate SSO login flow
     * Redirects user to OAuth provider
     */
    server.get('/api/sso/login/:provider', async (request, reply) => {
        try {
            const { provider } = request.params;
            const { redirect_uri } = request.query;
            if (!['google', 'microsoft', 'github', 'okta', 'saml'].includes(provider)) {
                return reply.code(400).send({
                    error: 'invalid_provider',
                    message: `Provider ${provider} is not supported. Supported: google, microsoft, github, okta, saml`
                });
            }
            if (!redirect_uri) {
                return reply.code(400).send({
                    error: 'missing_redirect_uri',
                    message: 'redirect_uri query parameter is required'
                });
            }
            const ssoConfig = getSSOConfig();
            if (!ssoConfig[provider]) {
                return reply.code(400).send({
                    error: 'provider_not_configured',
                    message: `SSO provider ${provider} is not configured. Please set up provider credentials.`
                });
            }
            // Construct backend callback URL for OAuth provider
            // OAuth providers need the backend callback URL, not the frontend URL
            // In Vercel/production, use environment variable or detect from headers
            let backendCallbackUrl;
            // Try to use explicit BACKEND_URL env var first (most reliable)
            if (process.env.BACKEND_URL) {
                backendCallbackUrl = `${process.env.BACKEND_URL}/api/sso/callback/${provider}`;
            }
            else {
                // Fallback to constructing from request (works in Vercel)
                const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'https';
                const host = request.headers['host'] || request.hostname || process.env.VERCEL_URL || 'localhost:4000';
                backendCallbackUrl = `${protocol}://${host}/api/sso/callback/${provider}`;
            }
            // Log the redirect URI for debugging (remove in production if sensitive)
            request.log.info({
                provider,
                backendCallbackUrl,
                frontendRedirectUri: redirect_uri
            }, 'SSO login initiated');
            // Pass both: backend callback URL for OAuth, frontend redirect URI for final redirect
            const loginUrl = await (0, ssoService_1.getSSOLoginUrl)(provider, backendCallbackUrl, // OAuth redirect URI (backend callback)
            redirect_uri, // Frontend redirect URI (stored in state for later)
            ssoConfig);
            // Redirect to OAuth provider
            return reply.redirect(loginUrl);
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: 'sso_login_failed',
                message: error?.message || 'Failed to initiate SSO login'
            });
        }
    });
    /**
     * GET /api/sso/callback/:provider
     * Handle SSO callback after OAuth redirect
     * Creates or links user account and returns JWT token
     */
    server.get('/api/sso/callback/:provider', async (request, reply) => {
        try {
            const { provider } = request.params;
            const { code, state, error, error_description } = request.query;
            if (!['google', 'microsoft', 'github', 'okta', 'saml'].includes(provider)) {
                return reply.code(400).send({
                    error: 'invalid_provider',
                    message: `Provider ${provider} is not supported`
                });
            }
            // Check for OAuth errors
            if (error) {
                return reply.code(400).send({
                    error: 'oauth_error',
                    message: error_description || error || 'OAuth authorization failed'
                });
            }
            if (!code || !state) {
                return reply.code(400).send({
                    error: 'missing_parameters',
                    message: 'code and state query parameters are required'
                });
            }
            const ssoConfig = getSSOConfig();
            const result = await (0, ssoService_1.handleSSOCallback)(provider, code, state, ssoConfig);
            // Get frontend redirect URI from state (stored during login initiation)
            const { getStoredFrontendRedirectUri } = await Promise.resolve().then(() => __importStar(require('../services/ssoService')));
            const frontendRedirectUri = getStoredFrontendRedirectUri(state) ||
                (config_1.config.nodeEnv === 'production'
                    ? process.env.FRONTEND_URL || 'https://safe-node.vercel.app'
                    : 'http://localhost:5173') + '/auth/sso/callback';
            // Redirect to frontend with token
            const redirectUrl = new URL(frontendRedirectUri);
            redirectUrl.searchParams.set('token', result.token);
            redirectUrl.searchParams.set('user_id', result.user.id);
            return reply.redirect(redirectUrl.toString());
        }
        catch (error) {
            request.log.error(error);
            // Redirect to frontend error page
            const frontendUrl = config_1.config.nodeEnv === 'production'
                ? process.env.FRONTEND_URL || 'https://safenode.app'
                : 'http://localhost:5173';
            const errorUrl = new URL(`${frontendUrl}/auth/sso/error`);
            errorUrl.searchParams.set('error', error?.message || 'SSO callback failed');
            return reply.redirect(errorUrl.toString());
        }
    });
    /**
     * GET /api/sso/providers
     * List available SSO providers (public endpoint)
     */
    server.get('/api/sso/providers', async (request, reply) => {
        try {
            const ssoConfig = getSSOConfig();
            const providers = [];
            if (ssoConfig.google) {
                providers.push({
                    id: 'google',
                    name: 'Google',
                    type: 'oauth',
                    enabled: true
                });
            }
            if (ssoConfig.microsoft) {
                providers.push({
                    id: 'microsoft',
                    name: 'Microsoft',
                    type: 'oauth',
                    enabled: true
                });
            }
            if (ssoConfig.github) {
                providers.push({
                    id: 'github',
                    name: 'GitHub',
                    type: 'oauth',
                    enabled: true
                });
            }
            return reply.send({
                success: true,
                providers
            });
        }
        catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: 'failed_to_list_providers',
                message: error?.message || 'Failed to list SSO providers'
            });
        }
    });
}
