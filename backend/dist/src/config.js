"use strict";
/**
 * Configuration Management
 * Loads and validates environment variables with sensible defaults
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
/**
 * Get configuration from environment variables
 * Provides sensible defaults for development
 */
function getConfig() {
    const nodeEnv = (process.env.NODE_ENV || 'development');
    const databaseUrl = process.env.DATABASE_URL ||
        process.env.POSTGRES_PRISMA_URL ||
        process.env.POSTGRES_URL_NON_POOLING ||
        process.env.POSTGRES_URL ||
        null;
    // JWT_SECRET is required for authentication
    // In production, this MUST be a strong random string (32+ bytes)
    // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret && nodeEnv === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
    }
    // ENCRYPTION_KEY is required in production for vault encryption at rest
    // Should be a 32-byte base64-encoded key
    // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    const encryptionKey = process.env.ENCRYPTION_KEY || null;
    if (nodeEnv === 'production' && !encryptionKey) {
        console.error('CRITICAL: ENCRYPTION_KEY is required in production for vault encryption at rest');
        console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
        // Don't throw — allow startup but log critical warning so it shows in Vercel logs
    }
    if (encryptionKey && Buffer.from(encryptionKey, 'base64').length !== 32) {
        console.warn('WARNING: ENCRYPTION_KEY should be a 32-byte base64-encoded key');
    }
    return {
        // Server configuration
        port: parseInt(process.env.PORT || '4000', 10),
        nodeEnv,
        // Database adapter selection
        // Options: 'file' (default, in-memory), 'prisma' (PostgreSQL/MySQL), 'mongo' (MongoDB)
        // To use Prisma: Set DB_ADAPTER=prisma and provide DATABASE_URL
        // Vercel/Supabase fallback vars are also supported:
        // POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING, POSTGRES_URL
        // To use MongoDB: Set DB_ADAPTER=mongo and provide MONGO_URI
        dbAdapter: (process.env.DB_ADAPTER || (databaseUrl ? 'prisma' : 'file')),
        databaseUrl,
        mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/safenode',
        // Security - CRITICAL: Rotate these keys regularly in production
        jwtSecret: jwtSecret || 'dev-secret-change-in-production-' + Date.now(),
        encryptionKey,
        // Rate limiting (requests per window)
        // Higher limits in development to prevent issues during testing
        rateLimitWindowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || (nodeEnv === 'development' ? '1' : '15'), 10),
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || (nodeEnv === 'development' ? '1000' : '100'), 10),
        // Stripe configuration
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || null,
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
        billingProvider: ((process.env.BILLING_PROVIDER || 'paddle').toLowerCase() === 'stripe' ? 'stripe' : 'paddle'),
        paddleApiKey: process.env.PADDLE_API_KEY || null,
        paddleWebhookSecret: process.env.PADDLE_WEBHOOK_SECRET || null,
        // CORS - in production, restrict to your frontend domain
        // Supports comma-separated URLs and automatically includes Vercel preview URLs
        corsOrigin: nodeEnv === 'production'
            ? (() => {
                const explicitOrigins = process.env.CORS_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean) || [];
                // Always allow the known production frontend
                const knownOrigins = [
                    'https://safe-node.app',
                    'https://www.safe-node.app',
                ];
                const allOrigins = [...new Set([...knownOrigins, ...explicitOrigins])];
                return allOrigins;
            })()
            : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]
    };
}
exports.config = getConfig();
function getMissingPaddlePriceVars() {
    const required = [
        'PADDLE_PRICE_INDIVIDUAL_MONTHLY',
        'PADDLE_PRICE_INDIVIDUAL_ANNUAL',
        'PADDLE_PRICE_FAMILY_MONTHLY',
        'PADDLE_PRICE_FAMILY_ANNUAL',
        'PADDLE_PRICE_TEAMS_MONTHLY',
        'PADDLE_PRICE_TEAMS_ANNUAL'
    ];
    return required.filter((key) => !process.env[key]);
}
// Validate critical configuration
if (exports.config.nodeEnv === 'production') {
    if (exports.config.jwtSecret === 'dev-secret-change-in-production-' || exports.config.jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    if (!exports.config.encryptionKey) {
        console.warn('WARNING: ENCRYPTION_KEY not set. Vault data will not be encrypted at rest.');
    }
    if (exports.config.billingProvider === 'stripe') {
        if (!exports.config.stripeSecretKey) {
            console.warn('WARNING: STRIPE_SECRET_KEY not set. Stripe billing will not work.');
        }
        if (!exports.config.stripeWebhookSecret) {
            console.warn('WARNING: STRIPE_WEBHOOK_SECRET not set. Stripe webhook verification will fail.');
        }
    }
    if (exports.config.billingProvider === 'paddle') {
        if (!exports.config.paddleApiKey) {
            console.warn('WARNING: PADDLE_API_KEY not set. Paddle API-backed checkout creation will not work.');
        }
        if (!exports.config.paddleWebhookSecret) {
            console.warn('WARNING: PADDLE_WEBHOOK_SECRET not set. Paddle webhook verification will fail.');
        }
        const missingPriceVars = getMissingPaddlePriceVars();
        if (missingPriceVars.length > 0) {
            console.warn(`WARNING: Missing Paddle price env vars: ${missingPriceVars.join(', ')}`);
            console.warn('WARNING: Plan mapping and checkout may fail until all 6 PADDLE_PRICE_* values are set.');
        }
    }
}
