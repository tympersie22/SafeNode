/**
 * Database Seed
 * Creates demo/admin accounts for testing
 */

import { db } from '../services/database'
import { createUser } from '../services/userService'

const DEMO_EMAIL = 'demo@safenode.app'
const DEMO_PASSWORD = 'demo-password'

/**
 * Seed demo admin account
 */
export async function seedDemoAccount(): Promise<void> {
  try {
    // Check if demo account already exists
    const existing = await db.users.findByEmail(DEMO_EMAIL)
    
    if (existing) {
      console.log(`✅ Demo account already exists: ${DEMO_EMAIL}`)
      
      // Update to ensure it has admin role
      await db.users.update(existing.id, {
        role: 'superadmin',
        subscriptionTier: 'enterprise',
        emailVerified: true
      })
      console.log(`✅ Demo account updated with admin privileges`)
      return
    }

    // Create demo admin account
    console.log(`🌱 Creating demo admin account: ${DEMO_EMAIL}`)
    
    const demoUser = await createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: 'Demo Admin'
    })

    // Update with admin privileges
    await db.users.update(demoUser.id, {
      role: 'superadmin',
      subscriptionTier: 'enterprise',
      emailVerified: true
    })

    console.log(`✅ Demo admin account created successfully`)
    console.log(`   Email: ${DEMO_EMAIL}`)
    console.log(`   Password: ${DEMO_PASSWORD}`)
    console.log(`   Role: superadmin`)
    console.log(`   Subscription: enterprise`)
    
  } catch (error: any) {
    console.error('❌ Error seeding demo account:', error)
    throw error
  }
}

/**
 * Initialize database with seed data
 * Note: generateDemoVault is called separately in index.ts to avoid circular dependency
 */
export async function seedDatabase(): Promise<void> {
  try {
    console.log('🌱 Seeding database...')
    
    // Create demo admin account
    await seedDemoAccount()
    
    console.log('✅ Database seeding completed')
  } catch (error: any) {
    console.error('❌ Database seeding failed:', error)
    // Don't throw - allow server to start even if seeding fails
  }
}

