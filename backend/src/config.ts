/**
 * Configuration Management
 * Loads and validates environment variables with sensible defaults
 */

import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

export interface Config {
  // Server
  port: number
  nodeEnv: 'development' | 'production' | 'test'
  
  // Database
  dbAdapter: 'file' | 'prisma' | 'mongo'
  databaseUrl: string | null
  mongoUri: string
  
  // Security
  jwtSecret: string
  encryptionKey: string | null
  
  // Rate Limiting
  rateLimitWindowMinutes: number
  rateLimitMax: number
  
  // CORS
  corsOrigin: string | RegExp[]
}

/**
 * Get configuration from environment variables
 * Provides sensible defaults for development
 */
function getConfig(): Config {
  const nodeEnv = (process.env.NODE_ENV || 'development') as Config['nodeEnv']
  
  // JWT_SECRET is required for authentication
  // In production, this MUST be a strong random string (32+ bytes)
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret && nodeEnv === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production')
  }
  
  // ENCRYPTION_KEY is optional but recommended for production
  // Should be a 32-byte base64-encoded key
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  const encryptionKey = process.env.ENCRYPTION_KEY || null
  if (encryptionKey && Buffer.from(encryptionKey, 'base64').length !== 32) {
    console.warn('WARNING: ENCRYPTION_KEY should be a 32-byte base64-encoded key')
  }
  
  return {
    // Server configuration
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv,
    
    // Database adapter selection
    // Options: 'file' (default, in-memory), 'prisma' (PostgreSQL/MySQL), 'mongo' (MongoDB)
    // To use Prisma: Set DB_ADAPTER=prisma and provide DATABASE_URL
    // To use MongoDB: Set DB_ADAPTER=mongo and provide MONGO_URI
    dbAdapter: (process.env.DB_ADAPTER || 'file') as Config['dbAdapter'],
    databaseUrl: process.env.DATABASE_URL || null,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/safenode',
    
    // Security - CRITICAL: Rotate these keys regularly in production
    jwtSecret: jwtSecret || 'dev-secret-change-in-production-' + Date.now(),
    encryptionKey,
    
    // Rate limiting (requests per window)
    // Higher limits in development to prevent issues during testing
    rateLimitWindowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || (nodeEnv === 'development' ? '1' : '15'), 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || (nodeEnv === 'development' ? '1000' : '100'), 10),
    
    // CORS - in production, restrict to your frontend domain
    corsOrigin: nodeEnv === 'production' 
      ? (process.env.CORS_ORIGIN?.split(',') || ['https://safenode.app']) as unknown as string | RegExp[]
      : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]
  }
}

export const config = getConfig()

// Validate critical configuration
if (config.nodeEnv === 'production') {
  if (config.jwtSecret === 'dev-secret-change-in-production-' || config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production')
  }
  if (!config.encryptionKey) {
    console.warn('WARNING: ENCRYPTION_KEY not set. Vault data will not be encrypted at rest.')
  }
}

