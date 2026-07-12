/**
 * Test Setup
 * Global test configuration and utilities
 */

import { beforeAll, afterAll, beforeEach } from '@jest/globals'
import { getPrismaClient } from '../src/db/prisma'
import { initSentry } from '../src/services/sentryService'

/**
 * Safety guard: the beforeEach hook wipes every table. Refuse to run unless the
 * target database is clearly a test database, so we can never destroy a dev or
 * production database (e.g. `safenode`, or the Neon URL in .env/.env.local) by
 * accident. Set ALLOW_NON_TEST_DB=true only if you really mean it.
 */
function assertTestDatabase(): void {
  if (process.env.ALLOW_NON_TEST_DB === 'true') return
  const url = process.env.DATABASE_URL || ''
  let dbName = ''
  try {
    dbName = new URL(url).pathname.replace(/^\//, '').split('?')[0]
  } catch {
    dbName = ''
  }
  const looksLikeTest = /(^|[_-])test($|[_-])|test$/i.test(dbName)
  if (!url || !looksLikeTest) {
    throw new Error(
      `Refusing to run destructive tests against database "${dbName || '(unknown)'}" ` +
      `(DATABASE_URL). Tests wipe all tables in beforeEach. Point DATABASE_URL at a ` +
      `dedicated test DB whose name contains "test" (e.g. safenode_test), or set ` +
      `ALLOW_NON_TEST_DB=true to override.`
    )
  }
}

// Disable Sentry in tests + verify we are pointed at a test database
beforeAll(() => {
  process.env.SENTRY_DSN = ''
  process.env.NODE_ENV = 'test'
  assertTestDatabase()
})

// Clean database before each test
beforeEach(async () => {
  const prisma = getPrismaClient()
  
  // Clean all tables (order matters due to foreign keys)
  await prisma.auditLog.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.teamVault.deleteMany()
  await prisma.team.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.device.deleteMany()
  await prisma.emailVerificationToken.deleteMany()
  await prisma.user.deleteMany()
})

// Close database connection after all tests
afterAll(async () => {
  const prisma = getPrismaClient()
  await prisma.$disconnect()
})

