/**
 * Database Seed
 * Idempotent seeding with stable demo user ID
 * Only seeds when DB is empty or SEED_ON_BOOT=true
 * Never drops users on dev restart unless explicitly requested
 */

import { db } from '../services/database'
import { getPrismaClient } from './prisma'
import { createHash } from 'crypto'
import { hashPassword } from '../utils/password'

const DEMO_EMAIL = 'demo@safenode.app'
const DEMO_PASSWORD = 'demo-password'

// Stable demo user ID from env or deterministic generation
function getStableDemoUserId(): string {
  // Use DEMO_USER_ID from env if provided (for consistency across reseeds)
  if (process.env.DEMO_USER_ID) {
    return process.env.DEMO_USER_ID
  }
  
  // Otherwise, generate deterministic ID from email
  // This ensures same ID across reseeds if env var not set
  const hash = createHash('sha256').update(DEMO_EMAIL).digest('hex')
  // Use first 25 chars of hash (cuid format is 25 chars)
  return `demo-${hash.substring(0, 20)}`
}

/**
 * Check if database is empty (no users)
 */
async function isDatabaseEmpty(): Promise<boolean> {
  try {
    const prisma = getPrismaClient()
    const userCount = await prisma.user.count()
    return userCount === 0
  } catch (error) {
    console.error('Error checking database:', error)
    return false
  }
}

/**
 * Upsert demo account by email (idempotent)
 * Uses stable demo user ID if provided in env
 */
export async function seedDemoAccount(): Promise<void> {
  try {
    const nodeEnv = process.env.NODE_ENV || 'development'
    const seedOnBoot = process.env.SEED_ON_BOOT === 'true'
    const forceReset = process.env.FORCE_RESET_DB === 'true'
    const stableDemoId = getStableDemoUserId()
    
    const prisma = getPrismaClient()
    const normalizedEmail = DEMO_EMAIL.toLowerCase().trim()
    
    // Hash password with pepper (same function used in userService)
    const passwordHash = await hashPassword(DEMO_PASSWORD)
    
    // Upsert by email (idempotent - creates if not exists, updates if exists)
    // This ensures the user always exists with the correct password hash
    const updateData: any = {
      passwordHash, // Always update password hash in case pepper changed
          role: 'superadmin',
          subscriptionTier: 'enterprise',
      emailVerified: true,
      displayName: 'Demo Admin'
      }
      
    // Bump tokenVersion if force reset
    if (forceReset && nodeEnv !== 'production') {
      const existing = await db.users.findByEmail(normalizedEmail)
      if (existing) {
        updateData.tokenVersion = (existing.tokenVersion || 1) + 1
      }
    }
    
    const demoUser = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: updateData,
      create: {
        id: stableDemoId,
        email: normalizedEmail,
        passwordHash,
        displayName: 'Demo Admin',
      role: 'superadmin',
      subscriptionTier: 'enterprise',
        emailVerified: true,
        vaultSalt: '', // Will be set when vault is initialized
        tokenVersion: 1
      }
    })

    console.log(`✅ Seed user upserted: ${normalizedEmail}`)
    console.log(`   User ID: ${demoUser.id}`)
    console.log(`   Email: ${normalizedEmail}`)
    console.log(`   Password: ${DEMO_PASSWORD}`)
    console.log(`   Role: superadmin`)
    console.log(`   Subscription: enterprise`)
    
  } catch (error: any) {
    console.error('❌ Error seeding demo account:', error)
    throw error
  }
}

/**
 * Initialize database with seed data (idempotent)
 * 
 * Rules:
 * - Only seeds when DB is empty OR SEED_ON_BOOT=true
 * - Never deletes users on dev restart unless FORCE_RESET_DB=true
 * - In production: Only runs if FORCE_SEED=true
 * - Bumps tokenVersion on reseed to invalidate old tokens
 */
export async function seedDatabase(): Promise<void> {
  try {
    const nodeEnv = process.env.NODE_ENV || 'development'
    const forceSeed = process.env.FORCE_SEED === 'true'
    const seedOnBoot = process.env.SEED_ON_BOOT === 'true'
    const forceReset = process.env.FORCE_RESET_DB === 'true'
    
    // PRODUCTION SAFETY: Only seed if explicitly forced
    if (nodeEnv === 'production' && !forceSeed) {
      console.log('⚠️  Skipping database seeding - production mode (use FORCE_SEED=true to override)')
      return
    }
    
    // Check if database is empty
    const isEmpty = await isDatabaseEmpty()
    
    // Only seed if:
    // 1. Database is empty, OR
    // 2. SEED_ON_BOOT=true is set
    if (!isEmpty && !seedOnBoot && !forceReset) {
      console.log('✅ Database already has users - skipping seed (set SEED_ON_BOOT=true to force)')
      return
    }
    
    // Show banner if seeding will invalidate tokens
    if (forceReset && nodeEnv !== 'production') {
      console.log('')
      console.log('⚠️  ════════════════════════════════════════════════════════════')
      console.log('⚠️  WARNING: FORCE_RESET_DB=true - Token version will be bumped')
      console.log('⚠️  All existing JWT tokens will be invalidated')
      console.log('⚠️  Users will need to log in again')
      console.log('⚠️  ════════════════════════════════════════════════════════════')
      console.log('')
    }
    
    if (nodeEnv === 'production') {
      console.log('🌱 Seeding database (production mode - FORCE_SEED=true)...')
    } else {
      console.log('🌱 Seeding database (development mode)...')
    }
    
    // Create demo admin account (idempotent upsert)
    await seedDemoAccount()
    
    console.log('✅ Database seeding completed')
  } catch (error: any) {
    console.error('❌ Database seeding failed:', error)
    // Don't throw - allow server to start even if seeding fails
  }
}
