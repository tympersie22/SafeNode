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

    try {
      if (this.adapter === 'prisma') {
        await initPrisma()
        // Verify connection
        const prisma = getPrismaClient()
        await prisma.$queryRaw`SELECT 1`
        console.log(`📦 Database adapter initialized: ${this.adapter} (Prisma)`)
      } else if (this.adapter === 'mongo') {
        // MongoDB initialization will be handled by mongoAdapter
        console.log(`📦 Database adapter initialized: ${this.adapter}`)
      } else {
        console.log(`📦 Database adapter initialized: ${this.adapter} (in-memory)`)
      }
      this.isInitialized = true
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      // Fall back to memory adapter if Prisma fails
      if (this.adapter === 'prisma') {
        console.warn('⚠️ Falling back to in-memory database')
        this.adapter = 'memory'
        this.isInitialized = true
      } else {
        throw error
      }
    }
  }

  users = {
    /**
     * Create a new user
     */
    async create(user: User): Promise<User> {
      if (this.adapter === 'prisma') {
        return prismaUserAdapter.create(user)
      }
      
      // Fallback to memory adapter
      inMemoryUsers.set(user.id, { ...user })
      inMemoryUsersByEmail.set(user.email.toLowerCase().trim(), user.id)
      return { ...user }
    },

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
      if (this.adapter === 'prisma') {
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
      if (this.adapter === 'prisma') {
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
      if (this.adapter === 'prisma') {
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
      if (this.adapter === 'prisma') {
        return prismaUserAdapter.emailExists(email)
      }
      
      // Fallback to memory adapter
      return inMemoryUsersByEmail.has(email.toLowerCase().trim())
    }
  }
}

export const db = new DatabaseService()

