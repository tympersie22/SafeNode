#!/usr/bin/env ts-node
/**
 * Reset Demo User Vault
 * Clears all vault data for the demo user so they can set a new master password
 */

import { getPrismaClient } from '../src/db/prisma'

const DEMO_EMAIL = 'demo@safenode.app'

async function resetDemoVault() {
  try {
    console.log('🔄 Resetting vault for demo user...')
    
    const prisma = getPrismaClient()
    const normalizedEmail = DEMO_EMAIL.toLowerCase().trim()
    
    // Find the demo user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, vaultSalt: true, vaultEncrypted: true }
    })
    
    if (!user) {
      console.error('❌ Demo user not found:', normalizedEmail)
      process.exit(1)
    }
    
    console.log(`   Found user: ${user.email} (${user.id})`)
    
    if (user.vaultSalt && user.vaultSalt.length > 0) {
      console.log('   ⚠️  User has existing vault data - clearing...')
    } else {
      console.log('   ℹ️  User has no vault data - already reset')
    }
    
    // Reset vault data (clear everything but keep the user account)
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        vaultSalt: '', // Empty salt means vault is not initialized
        vaultEncrypted: '',
        vaultIV: '',
        vaultVersion: 0
      }
    })
    
    console.log('✅ Vault reset successfully!')
    console.log('')
    console.log('📝 Next steps:')
    console.log('   1. Log in with: demo@safenode.app / demo-password')
    console.log('   2. You will see the "Set Up Master Password" screen')
    console.log('   3. Set your new master password (remember it!)')
    console.log('   4. Your vault will be initialized with the new password')
    console.log('')
    
    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Error resetting vault:', error.message)
    process.exit(1)
  }
}

resetDemoVault()

