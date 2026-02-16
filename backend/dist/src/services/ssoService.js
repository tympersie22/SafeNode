"use strict";
/**
 * SSO Service
 * Handles Enterprise SSO integrations (SAML, OAuth2/OIDC)
 * Supports Google, Microsoft, GitHub, and generic SAML providers
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
exports.getSSOLoginUrl = getSSOLoginUrl;
exports.handleSSOCallback = handleSSOCallback;
exports.initializeSSOProvider = initializeSSOProvider;
exports.cleanupExpiredStates = cleanupExpiredStates;
exports.getStoredFrontendRedirectUri = getStoredFrontendRedirectUri;
const crypto_1 = require("crypto");
const database_1 = require("./database");
const userService_1 = require("./userService");
const auth_1 = require("../middleware/auth");
// Dynamic import for node-fetch (ESM-only, can't use static import with CommonJS)
let fetch;
const getFetch = async () => {
    if (!fetch) {
        const module = await Promise.resolve().then(() => __importStar(require('node-fetch')));
        fetch = module.default;
    }
    return fetch;
};
// In-memory state storage for OAuth flows (use Redis in production)
const oauthStates = new Map();
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
    }
};
/**
 * Generate a secure random state for OAuth flow
 */
function generateState() {
    return (0, crypto_1.randomBytes)(32).toString('hex');
}
/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE() {
    const codeVerifier = (0, crypto_1.randomBytes)(32).toString('base64url');
    const codeChallenge = (0, crypto_1.createHash)('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
}
/**
 * Get SSO login URL for OAuth2 providers
 * @param provider - OAuth provider name
 * @param oauthRedirectUri - Backend callback URL (what OAuth provider needs)
 * @param frontendRedirectUri - Frontend redirect URI (stored in state for final redirect)
 * @param config - SSO configuration
 */
async function getSSOLoginUrl(provider, oauthRedirectUri, frontendRedirectUri, config) {
    const state = generateState();
    const { codeVerifier, codeChallenge } = generatePKCE();
    // Store state with verifier (use Redis in production)
    // OAuth redirect URI is what the provider needs, frontend redirect URI is for final redirect
    oauthStates.set(state, {
        provider,
        redirectUri: oauthRedirectUri, // Backend callback URL for OAuth
        frontendRedirectUri, // Frontend URL for final redirect
        createdAt: Date.now()
    });
    oauthStates.verifiers = oauthStates.verifiers || new Map();
    oauthStates.verifiers.set(state, codeVerifier);
    const providerConfig = PROVIDER_CONFIGS[provider];
    if (!providerConfig) {
        throw new Error(`Provider ${provider} not supported`);
    }
    const providerConfigObj = config[provider];
    if (!providerConfigObj || !('clientId' in providerConfigObj)) {
        throw new Error(`Configuration missing for provider ${provider}`);
    }
    const clientId = providerConfigObj.clientId;
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: oauthRedirectUri, // Use backend callback URL for OAuth
        response_type: 'code',
        scope: providerConfig.scopes.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });
    let authUrl = providerConfig.authUrl;
    if (provider === 'microsoft' && 'tenantId' in providerConfigObj && providerConfigObj.tenantId) {
        authUrl = authUrl.replace('{tenant}', providerConfigObj.tenantId);
    }
    else if (provider === 'microsoft') {
        authUrl = authUrl.replace('{tenant}', 'common');
    }
    return `${authUrl}?${params.toString()}`;
}
/**
 * Exchange OAuth code for access token and get user info
 */
async function exchangeCodeForToken(provider, code, redirectUri, config, codeVerifier) {
    const providerConfig = PROVIDER_CONFIGS[provider];
    const providerConfigObj = config[provider];
    if (!providerConfigObj || !providerConfigObj.clientId || !providerConfigObj.clientSecret) {
        throw new Error(`Configuration missing for provider ${provider}`);
    }
    let tokenUrl = providerConfig.tokenUrl;
    if (provider === 'microsoft' && providerConfigObj.tenantId) {
        tokenUrl = tokenUrl.replace('{tenant}', providerConfigObj.tenantId);
    }
    else if (provider === 'microsoft') {
        tokenUrl = tokenUrl.replace('{tenant}', 'common');
    }
    const tokenParams = {
        client_id: providerConfigObj.clientId,
        client_secret: providerConfigObj.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    };
    // Add PKCE code verifier if available (required for PKCE flow)
    if (codeVerifier) {
        tokenParams.code_verifier = codeVerifier;
    }
    if (provider === 'github') {
        tokenParams.client_secret = providerConfigObj.clientSecret;
    }
    const fetchFn = await getFetch();
    const tokenResponse = await fetchFn(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: new URLSearchParams(tokenParams).toString()
    });
    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
        throw new Error('No access token received');
    }
    // Fetch user info
    let userInfoUrl = providerConfig.userInfoUrl;
    if (provider === 'github') {
        userInfoUrl = providerConfig.userInfoUrl;
    }
    const userInfoResponse = await fetchFn(userInfoUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
        }
    });
    if (!userInfoResponse.ok) {
        throw new Error(`Failed to fetch user info: ${userInfoResponse.status}`);
    }
    const userInfo = await userInfoResponse.json();
    // Normalize user info across providers
    let normalizedUserInfo;
    if (provider === 'google') {
        normalizedUserInfo = {
            email: userInfo.email,
            name: (userInfo.name || userInfo.given_name || ''),
            id: userInfo.id
        };
    }
    else if (provider === 'microsoft') {
        normalizedUserInfo = {
            email: userInfo.mail || userInfo.userPrincipalName,
            name: userInfo.displayName || userInfo.givenName || '',
            id: userInfo.id
        };
    }
    else if (provider === 'github') {
        // GitHub requires separate email endpoint
        const emailResponse = await fetchFn('https://api.github.com/user/emails', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        const emails = await emailResponse.json();
        const primaryEmail = emails.find(e => e.primary) || emails[0];
        normalizedUserInfo = {
            email: primaryEmail.email,
            name: userInfo.name || userInfo.login,
            id: userInfo.id.toString()
        };
    }
    else {
        throw new Error(`Unsupported provider: ${provider}`);
    }
    return { accessToken, userInfo: normalizedUserInfo };
}
/**
 * Handle SSO callback and create/link user account
 */
async function handleSSOCallback(provider, code, state, config) {
    // Verify state
    const storedState = oauthStates.get(state);
    if (!storedState) {
        throw new Error('Invalid or expired OAuth state');
    }
    // Clean up expired states (older than 10 minutes)
    const now = Date.now();
    if (now - storedState.createdAt > 10 * 60 * 1000) {
        oauthStates.delete(state);
        if (oauthStates.verifiers) {
            oauthStates.verifiers.delete(state);
        }
        throw new Error('OAuth state expired');
    }
    if (storedState.provider !== provider) {
        throw new Error('Provider mismatch in OAuth state');
    }
    const redirectUri = storedState.redirectUri;
    const codeVerifier = oauthStates.verifiers?.get(state);
    // Handle OAuth providers
    if (provider === 'google' || provider === 'microsoft' || provider === 'github') {
        const { userInfo } = await exchangeCodeForToken(provider, code, redirectUri, config, codeVerifier);
        // Check if user exists by email
        let user = await database_1.db.users.findByEmail(userInfo.email.toLowerCase().trim());
        if (!user) {
            // Create new user account
            user = await (0, userService_1.createUser)({
                email: userInfo.email,
                password: (0, crypto_1.randomBytes)(32).toString('hex'), // Random password, SSO users don't need it
                displayName: userInfo.name
            });
            // Mark email as verified (SSO emails are verified)
            await database_1.db.users.update(user.id, {
                emailVerified: true
            });
        }
        else {
            // Update last login
            await database_1.db.users.update(user.id, {
                lastLoginAt: Date.now()
            });
        }
        // Generate JWT token with tokenVersion
        const token = (0, auth_1.issueToken)({
            id: user.id,
            email: user.email,
            tokenVersion: user.tokenVersion || 1
        });
        // Clean up state and verifier
        oauthStates.delete(state);
        if (oauthStates.verifiers) {
            oauthStates.verifiers.delete(state);
        }
        return { user, token };
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
            throw new Error('SAML provider is not fully configured. SSO URL and X.509 certificate are required.');
        }
        // Placeholder for SAML assertion parsing
        // In production, use a library like `saml2-js` or `passport-saml`
        throw new Error('SAML/Okta SSO implementation requires saml2-js or similar library. Install and configure: npm install saml2-js');
    }
    throw new Error(`Unsupported provider: ${provider}`);
}
/**
 * Initialize SSO provider configuration
 */
async function initializeSSOProvider(provider, config) {
    // Validate configuration based on provider
    if (provider === 'google' || provider === 'microsoft' || provider === 'github') {
        if (!config.clientId || !config.clientSecret) {
            throw new Error(`${provider} requires clientId and clientSecret`);
        }
    }
    else if (provider === 'saml') {
        if (!config.entityId || !config.ssoUrl || !config.x509Cert) {
            throw new Error('SAML requires entityId, ssoUrl, and x509Cert');
        }
    }
    return {
        id: `sso-${provider}-${Date.now()}`,
        name: provider === 'saml' ? 'SAML Provider' : `${provider.charAt(0).toUpperCase() + provider.slice(1)} SSO`,
        type: provider === 'saml' ? 'saml' : 'oauth',
        enabled: true,
        config
    };
}
/**
 * Clean up expired OAuth states (call periodically)
 */
function cleanupExpiredStates() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    for (const [state, data] of oauthStates.entries()) {
        if (now - data.createdAt > maxAge) {
            oauthStates.delete(state);
            if (oauthStates.verifiers) {
                oauthStates.verifiers.delete(state);
            }
        }
    }
}
/**
 * Get frontend redirect URI from stored state
 */
function getStoredFrontendRedirectUri(state) {
    const storedState = oauthStates.get(state);
    return storedState?.frontendRedirectUri || null;
}
// Clean up expired states every 5 minutes
setInterval(cleanupExpiredStates, 5 * 60 * 1000);
