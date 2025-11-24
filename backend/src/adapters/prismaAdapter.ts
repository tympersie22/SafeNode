/**
 * Prisma Storage Adapter
 * Stores vault data in a SQL database (PostgreSQL, MySQL, SQLite)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install Prisma: npm install prisma @prisma/client
 * 2. Initialize Prisma: npx prisma init
 * 3. Update prisma/schema.prisma with the schema below
 * 4. Set DB_ADAPTER=prisma in .env
 * 5. Set DATABASE_URL in .env (e.g., postgresql://user:pass@localhost:5432/safenode)
 * 6. Run migrations: npx prisma migrate dev
 * 7. Generate Prisma Client: npx prisma generate
 * 
 * PRISMA SCHEMA (prisma/schema.prisma):
 * 
 * generator client {
 *   provider = "prisma-client-js"
 * }
 * 
 * datasource db {
 *   provider = "postgresql" // or "mysql" or "sqlite"
 *   url      = env("DATABASE_URL")
 * }
 * 
 * model Vault {
 *   id            String   @id @default("default")
 *   encryptedVault String
 *   iv            String
 *   salt          String?
 *   version       BigInt
 *   lastModified  BigInt
 *   isOffline     Boolean  @default(false)
 *   createdAt     DateTime @default(now())
 *   updatedAt     DateTime @updatedAt
 *   
 *   @@map("vaults")
 * }
 * 
 * USAGE:
 * - PostgreSQL: DATABASE_URL="postgresql://user:password@localhost:5432/safenode?schema=public"
 * - MySQL: DATABASE_URL="mysql://user:password@localhost:3306/safenode"
 * - SQLite: DATABASE_URL="file:./dev.db"
 */

import { PrismaClient } from '@prisma/client'
import { StoredVault } from '../validation/vaultSchema'
import { encryptWithConfig, decryptWithConfig } from '../utils/encryption'
import { config } from '../config'

// Prisma client instance (singleton)
let prisma: PrismaClient | null = null

/**
 * Gets or creates the Prisma client instance
 */
function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error']
    })
  }
  return prisma
}

/**
 * Prisma Adapter Implementation
 */
export const prismaAdapter = {
  /**
   * Initializes the Prisma client and tests the connection
   */
  async init(): Promise<void> {
    try {
      const client = getPrismaClient()
      await client.$connect()
      console.log('✅ Prisma adapter connected to database')
    } catch (error) {
      console.error('❌ Failed to connect to database with Prisma:', error)
      throw new Error('Database connection failed. Make sure DATABASE_URL is set and database is running.')
    }
  },
  
  /**
   * Reads the vault from the database
   * Automatically decrypts if encryption is enabled
   */
  async readVault(): Promise<StoredVault | null> {
    try {
      const client = getPrismaClient()
      const vault = await client.vault.findUnique({
        where: { id: 'default' }
      })
      
      if (!vault) {
        return null
      }
      
      // Convert BigInt to number for version and lastModified
      const storedVault: StoredVault = {
        id: vault.id,
        encryptedVault: vault.encryptedVault,
        iv: vault.iv,
        salt: vault.salt || undefined,
        version: Number(vault.version),
        lastModified: Number(vault.lastModified),
        isOffline: vault.isOffline
      }
      
      // If encryption is enabled, decrypt the stored data
      if (config.encryptionKey) {
        // Check if encryptedVault contains encrypted metadata
        try {
          const encryptedData = JSON.parse(vault.encryptedVault)
          if (encryptedData.data && encryptedData.authTag) {
            const decrypted = decryptWithConfig(
              encryptedData.data,
              vault.iv,
              encryptedData.authTag
            )
            
            if (decrypted) {
              return JSON.parse(decrypted.toString('utf8')) as StoredVault
            }
          }
        } catch {
          // Not encrypted JSON, proceed with normal decryption
        }
      }
      
      return storedVault
    } catch (error) {
      console.error('Error reading vault from Prisma:', error)
      throw error
    }
  },
  
  /**
   * Writes the vault to the database
   * Automatically encrypts if encryption is enabled
   */
  async writeVault(vault: StoredVault): Promise<void> {
    try {
      const client = getPrismaClient()
      
      let encryptedVault = vault.encryptedVault
      let iv = vault.iv
      
      // If encryption is enabled, encrypt the vault before storing
      if (config.encryptionKey) {
        const vaultJson = JSON.stringify(vault)
        const encrypted = encryptWithConfig(Buffer.from(vaultJson, 'utf8'))
        
        if (!encrypted) {
          throw new Error('Failed to encrypt vault data')
        }
        
        // Store encrypted data with authTag
        encryptedVault = JSON.stringify({
          data: encrypted.ciphertext,
          authTag: encrypted.authTag
        })
        iv = encrypted.iv
      }
      
      await client.vault.upsert({
        where: { id: vault.id || 'default' },
        create: {
          id: vault.id || 'default',
          encryptedVault,
          iv,
          salt: vault.salt || null,
          version: BigInt(vault.version),
          lastModified: BigInt(vault.lastModified || Date.now()),
          isOffline: vault.isOffline || false
        },
        update: {
          encryptedVault,
          iv,
          salt: vault.salt || null,
          version: BigInt(vault.version),
          lastModified: BigInt(vault.lastModified || Date.now()),
          isOffline: vault.isOffline || false
        }
      })
    } catch (error) {
      console.error('Error writing vault to Prisma:', error)
      throw error
    }
  },
  
  /**
   * Closes the Prisma client connection
   */
  async close(): Promise<void> {
    if (prisma) {
      await prisma.$disconnect()
      prisma = null
    }
  }
}

