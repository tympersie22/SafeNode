/**
 * Test Setup
 * Global test configuration and utilities
 */

import { beforeAll, afterAll, beforeEach } from '@jest/globals'
import { getPrismaClient } from '../src/db/prisma'
import { initSentry } from '../src/services/sentryService'

// Disable Sentry in tests
beforeAll(() => {
  process.env.SENTRY_DSN = ''
  process.env.NODE_ENV = 'test'
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

