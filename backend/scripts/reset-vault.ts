#!/usr/bin/env ts-node
/**
 * Reset Vault
 * Clears vault data for a specific user so they can set a new master password.
 *
 * Usage:
 *   SAFE_NODE_RESET_EMAIL=user@example.com npm run reset-vault
 *   npm run reset-vault -- user@example.com
 */

import { getPrismaClient } from '../src/db/prisma'

function getTargetEmail(): string {
  const cliEmail = process.argv[2]?.trim()
  const envEmail = process.env.SAFE_NODE_RESET_EMAIL?.trim()
  const email = cliEmail || envEmail

  if (!email) {
    console.error('❌ No target email provided.')
    console.error('   Use: SAFE_NODE_RESET_EMAIL=user@example.com npm run reset-vault')
    console.error('   Or:  npm run reset-vault -- user@example.com')
    process.exit(1)
  }

  return email.toLowerCase()
}

async function resetVault() {
  try {
    const targetEmail = getTargetEmail()
    console.log(`🔄 Resetting vault for user: ${targetEmail}`)

    const prisma = getPrismaClient()

    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true, email: true, vaultSalt: true, vaultEncrypted: true }
    })

    if (!user) {
      console.error('❌ User not found:', targetEmail)
      process.exit(1)
    }

    console.log(`   Found user: ${user.email} (${user.id})`)

    if (user.vaultSalt && user.vaultSalt.length > 0) {
      console.log('   ⚠️  User has existing vault data - clearing...')
    } else {
      console.log('   ℹ️  User has no vault data - already reset')
    }

    await prisma.user.update({
      where: { email: targetEmail },
      data: {
        vaultSalt: '',
        vaultEncrypted: '',
        vaultIV: '',
        vaultVersion: 0
      }
    })

    console.log('✅ Vault reset successfully!')
    console.log('')
    console.log('📝 Next steps:')
    console.log(`   1. Log in with: ${targetEmail}`)
    console.log('   2. You will see the "Set Up Master Password" screen')
    console.log('   3. Set the new master password and store it safely')
    console.log('   4. The vault will be initialized with the new password')
    console.log('')

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Error resetting vault:', error.message)
    process.exit(1)
  }
}

resetVault()
