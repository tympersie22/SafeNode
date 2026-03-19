/**
 * Storage Adapter Factory
 * Exports the appropriate adapter based on DB_ADAPTER environment variable
 * 
 * Supported adapters:
 * - 'file' (default): In-memory storage, data lost on restart
 * - 'prisma': SQL database (PostgreSQL, MySQL, SQLite) via Prisma ORM
 * - 'mongo': MongoDB database
 * 
 * To switch adapters, set DB_ADAPTER in .env file
 */

import { config } from '../config'
import { fileAdapter } from './fileAdapter'

export interface StorageAdapter {
  init(): Promise<void>
  readVault(): Promise<any>
  writeVault(vault: any): Promise<void>
  close(): Promise<void>
}

/**
 * Gets the configured storage adapter (lazy-loads Prisma/Mongo to avoid native binary errors)
 */
function getAdapter(): StorageAdapter {
  switch (config.dbAdapter) {
    case 'prisma': {
      console.log('📦 Using Prisma adapter (SQL database)')
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { prismaAdapter } = require('./prismaAdapter')
      return prismaAdapter
    }
    case 'mongo': {
      console.log('📦 Using MongoDB adapter')
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { mongoAdapter } = require('./mongoAdapter')
      return mongoAdapter
    }
    case 'file':
    default:
      console.log('📦 Using file adapter (in-memory)')
      return fileAdapter
  }
}

// Export the configured adapter
export const adapter = getAdapter()

// Re-export adapter methods for convenience
export const readVault = () => adapter.readVault()
export const writeVault = (vault: any) => adapter.writeVault(vault)

