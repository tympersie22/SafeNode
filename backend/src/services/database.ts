/**
 * Database Service
 * Abstraction layer for user data storage
 * Supports in-memory, MongoDB, and Prisma adapters
 */

import { User, UpdateUserInput } from '../models/User'
import { config } from '../config'
import { initPrisma, getPrismaClient } from '../db/prisma'
import { prismaUserAdapter } from '../db/adapters/prismaUserAdapter'

// In-memory storage for fallback/development
const inMemoryUsers: Map<string, User> = new Map()
const inMemoryUsersByEmail: Map<string, string> = new Map() // email -> userId

class DatabaseService {
  private adapter: 'memory' | 'mongo' | 'prisma'
  private isInitialized = false

  constructor() {
    // Map 'file' adapter to 'memory' for backward compatibility
    this.adapter = config.dbAdapter === 'mongo' ? 'mongo' 
                  : config.dbAdapter === 'prisma' ? 'prisma' 
                  : 'memory'
  }

  async init(): Promise<void> {
    if (this.isInitialized) return

      if (this.adapter === 'prisma') {
      // STRICT MODE: Fail hard if Prisma connection fails
      // NO FALLBACK to in-memory database
      if (!config.databaseUrl) {
        const error = new Error(
          'DATABASE_URL is required when using Prisma adapter. ' +
          'Please set DATABASE_URL in your .env file.'
        )
        console.error('❌ Database configuration error:', error.message)
        throw error
      }

      try {
        await initPrisma()
        // Verify connection with a test query
        const prisma = getPrismaClient()
        await prisma.$queryRaw`SELECT 1`
        console.log(`✅ Database adapter initialized: ${this.adapter} (Prisma)`)
        console.log(`   Connected to: ${config.databaseUrl.replace(/:[^:@]+@/, ':****@')}`)
      } catch (error: any) {
        console.error('❌ CRITICAL: Prisma database connection failed!')
        console.error('   Error:', error.message)
        console.error('   Code:', error.code)
        console.error('')
        console.error('🔧 FIX REQUIRED:')
        console.error('   1. Ensure PostgreSQL is running')
        console.error('   2. Verify DATABASE_URL is correct')
        console.error('   3. Check database exists: psql -U postgres -c "\\l"')
        console.error('   4. Create database if needed: createdb safenode')
        console.error('   5. Check user permissions')
        console.error('')
        console.error('❌ Server will NOT start without a valid database connection.')
        console.error('   This prevents data loss and ensures production reliability.')
        throw error
      }
      } else if (this.adapter === 'mongo') {
        // MongoDB initialization will be handled by mongoAdapter
        console.log(`📦 Database adapter initialized: ${this.adapter}`)
      } else {
      // Only allow in-memory in development mode
      if (config.nodeEnv === 'production') {
        throw new Error(
          'In-memory database adapter is not allowed in production. ' +
          'Please set DB_ADAPTER=prisma and provide DATABASE_URL.'
        )
      }
      console.log(`⚠️  Database adapter initialized: ${this.adapter} (in-memory) - DEVELOPMENT ONLY`)
      console.log(`   WARNING: Data will be lost on server restart!`)
    }
    
        this.isInitialized = true
  }

  users = {
    /**
     * Create a new user
     */
    async create(user: User): Promise<User> {
      // Ensure adapter is set (same pattern as emailExists)
      const adapter = this.adapter || (config.dbAdapter === 'mongo' ? 'mongo' : config.dbAdapter === 'prisma' ? 'prisma' : 'memory')
      
      console.log('[DatabaseService] users.create called:', {
        adapter: this.adapter,
        resolvedAdapter: adapter,
        configAdapter: config.dbAdapter,
        userId: user.id,
        email: user.email
      })
      
      if (adapter === 'prisma') {
        console.log('[DatabaseService] Routing to Prisma adapter')
        return prismaUserAdapter.create(user)
      }
      
      // Fallback to memory adapter
      console.log('[DatabaseService] Using memory adapter (WARNING: data will not persist)')
      inMemoryUsers.set(user.id, { ...user })
      inMemoryUsersByEmail.set(user.email.toLowerCase().trim(), user.id)
      return { ...user }
    },

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
      // Ensure adapter is set (fix for undefined adapter issue)
      const adapter = this.adapter || (config.dbAdapter === 'mongo' ? 'mongo' : config.dbAdapter === 'prisma' ? 'prisma' : 'memory')
      
      if (adapter === 'prisma') {
        return prismaUserAdapter.findById(id)
      }
      
      // Fallback to memory adapter
      const user = inMemoryUsers.get(id)
      return user ? { ...user } : null
    },

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
      // Ensure adapter is set (fix for undefined adapter issue - can happen with module loading)
      const adapter = this.adapter || (config.dbAdapter === 'mongo' ? 'mongo' : config.dbAdapter === 'prisma' ? 'prisma' : 'memory')
      
      if (adapter === 'prisma') {
        return prismaUserAdapter.findByEmail(email)
      }
      
      // Fallback to memory adapter
      const userId = inMemoryUsersByEmail.get(email.toLowerCase().trim())
      if (!userId) return null
      
      const user = inMemoryUsers.get(userId)
      return user ? { ...user } : null
    },

    /**
     * Update user
     */
    async update(id: string, input: UpdateUserInput): Promise<User | null> {
      // Ensure adapter is set (fix for undefined adapter issue)
      const adapter = this.adapter || (config.dbAdapter === 'mongo' ? 'mongo' : config.dbAdapter === 'prisma' ? 'prisma' : 'memory')
      
      if (adapter === 'prisma') {
        return prismaUserAdapter.update(id, input)
      }
      
      // Fallback to memory adapter
      const user = inMemoryUsers.get(id)
      if (!user) return null
      
      const updated: User = {
        ...user,
        ...input,
        updatedAt: Date.now()
      }
      
      inMemoryUsers.set(id, updated)
      return { ...updated }
    },

    /**
     * Delete user
     */
    async delete(id: string): Promise<boolean> {
      if (this.adapter === 'prisma') {
        return prismaUserAdapter.delete(id)
      }
      
      // Fallback to memory adapter
      const user = inMemoryUsers.get(id)
      if (user) {
        inMemoryUsersByEmail.delete(user.email.toLowerCase().trim())
        inMemoryUsers.delete(id)
        return true
      }
      return false
    },

    /**
     * Check if email exists
     */
    async emailExists(email: string): Promise<boolean> {
      // Ensure adapter is set
      const adapter = this.adapter || (config.dbAdapter === 'mongo' ? 'mongo' : config.dbAdapter === 'prisma' ? 'prisma' : 'memory')
      
      const normalizedEmail = email.toLowerCase().trim()
      
      // Validate email before checking
      if (!normalizedEmail || normalizedEmail.length === 0) {
        console.warn('[DatabaseService] Empty email provided to emailExists')
        return false
      }
      
      // Log for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('[DatabaseService] emailExists check:', {
          email: normalizedEmail,
          adapter,
          configAdapter: config.dbAdapter,
          memoryUsersCount: inMemoryUsersByEmail.size
        })
      }
      
      if (adapter === 'prisma') {
        return prismaUserAdapter.emailExists(normalizedEmail)
      }
      
      // Fallback to memory adapter
      const exists = inMemoryUsersByEmail.has(normalizedEmail)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DatabaseService] Memory adapter check result:', { email: normalizedEmail, exists })
      }
      
      return exists
    }
  }
}

export const db = new DatabaseService()

