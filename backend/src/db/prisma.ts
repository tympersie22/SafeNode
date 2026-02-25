/**
 * Prisma Database Client
 * Centralized Prisma client instance for SafeNode
 */

import { PrismaClient } from '@prisma/client'
import { config } from '../config'

let prisma: PrismaClient | null = null

function resolveDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    null
  )
}

/**
 * Get or create Prisma client instance
 * Uses singleton pattern to avoid multiple connections
 */
export function getPrismaClient(): PrismaClient {
  // Allow Vercel/Supabase POSTGRES_* vars without requiring manual DATABASE_URL duplication.
  const resolvedDatabaseUrl = resolveDatabaseUrl()
  if (!process.env.DATABASE_URL && resolvedDatabaseUrl) {
    process.env.DATABASE_URL = resolvedDatabaseUrl
  }

  if (!prisma) {
    prisma = new PrismaClient({
      log: config.nodeEnv === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      errorFormat: 'pretty'
    })
  }
  return prisma
}

/**
 * Initialize Prisma connection
 */
export async function initPrisma(): Promise<void> {
  const client = getPrismaClient()
  
  try {
    await client.$connect()
    console.log('✅ Prisma connected to database')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error)
    throw error
  }
}

/**
 * Disconnect Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
    console.log('✅ Prisma disconnected')
  }
}

/**
 * Health check - test database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const client = getPrismaClient()
    await client.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

export { PrismaClient }
