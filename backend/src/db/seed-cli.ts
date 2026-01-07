/**
 * CLI script for database seeding
 * Usage: pnpm seed [--reset]
 */

import { seedDatabase, seedDemoAccount } from './seed'
import { getPrismaClient } from './prisma'
import { initPrisma } from './prisma'

async function main() {
  const args = process.argv.slice(2)
  const reset = args.includes('--reset') || args.includes('-r')
  
  if (reset) {
    process.env.FORCE_RESET_DB = 'true'
    process.env.SEED_ON_BOOT = 'true'
    console.log('🔄 Reset mode: Will bump tokenVersion and invalidate old tokens')
  } else {
    process.env.SEED_ON_BOOT = 'true'
  }
  
  try {
    // Initialize Prisma
    await initPrisma()
    
    if (reset) {
      console.log('🗑️  Resetting database (bumping tokenVersion)...')
      const prisma = getPrismaClient()
      const users = await prisma.user.findMany()
      for (const user of users) {
        await prisma.user.update({
          where: { id: user.id },
          data: { tokenVersion: { increment: 1 } }
        })
      }
      console.log(`✅ Bumped tokenVersion for ${users.length} user(s)`)
    }
    
    // Seed database
    await seedDatabase()
    
    console.log('✅ Seeding completed')
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

main()

