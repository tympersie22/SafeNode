/**
 * MongoDB Storage Adapter
 * Stores vault data in MongoDB
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install MongoDB driver: npm install mongodb
 * 2. Start MongoDB: docker run -d -p 27017:27017 mongo (or use local MongoDB)
 * 3. Set DB_ADAPTER=mongo in .env
 * 4. Set MONGO_URI in .env (e.g., mongodb://localhost:27017/safenode)
 * 
 * USAGE:
 * - Local MongoDB: MONGO_URI="mongodb://localhost:27017/safenode"
 * - MongoDB Atlas: MONGO_URI="mongodb+srv://<credentials>@<cluster-url>/safenode"
 * - With auth: MONGO_URI="mongodb://<credentials>@localhost:27017/safenode?authSource=admin"
 */

import { MongoClient, Db, Collection } from 'mongodb'
import { StoredVault } from '../validation/vaultSchema'
import { encryptWithConfig, decryptWithConfig } from '../utils/encryption'
import { config } from '../config'

// MongoDB client and database instances
let client: MongoClient | null = null
let db: Db | null = null
let collection: Collection | null = null

const COLLECTION_NAME = 'vaults'
const VAULT_ID = 'default'

/**
 * Gets or creates the MongoDB connection
 */
async function getMongoConnection(): Promise<{ db: Db; collection: Collection }> {
  if (!client || !db || !collection) {
    if (!config.mongoUri) {
      throw new Error('MONGO_URI environment variable is required for MongoDB adapter')
    }
    
    client = new MongoClient(config.mongoUri, {
      // Connection options
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    })
    
    await client.connect()
    db = client.db()
    collection = db.collection(COLLECTION_NAME)
    
    // Create index on id field for faster lookups
    await collection.createIndex({ id: 1 }, { unique: true })
    
    console.log('✅ MongoDB adapter connected to database')
  }
  
  return { db: db!, collection: collection! }
}

/**
 * MongoDB Adapter Implementation
 */
export const mongoAdapter = {
  /**
   * Initializes the MongoDB connection
   */
  async init(): Promise<void> {
    try {
      await getMongoConnection()
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error)
      throw new Error('MongoDB connection failed. Make sure MONGO_URI is set and MongoDB is running.')
    }
  },
  
  /**
   * Reads the vault from MongoDB
   * Automatically decrypts if encryption is enabled
   */
  async readVault(): Promise<StoredVault | null> {
    try {
      const { collection } = await getMongoConnection()
      const vault = await collection.findOne({ id: VAULT_ID })
      
      if (!vault) {
        return null
      }
      
      // Convert MongoDB document to StoredVault
      const storedVault: StoredVault = {
        id: vault.id,
        encryptedVault: vault.encryptedVault,
        iv: vault.iv,
        salt: vault.salt || undefined,
        version: typeof vault.version === 'bigint' ? Number(vault.version) : vault.version,
        lastModified: typeof vault.lastModified === 'bigint' ? Number(vault.lastModified) : vault.lastModified,
        isOffline: vault.isOffline || false
      }
      
      // If encryption is enabled, decrypt the stored data
      if (config.encryptionKey) {
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
          // Not encrypted JSON, proceed with normal data
        }
      }
      
      return storedVault
    } catch (error) {
      console.error('Error reading vault from MongoDB:', error)
      throw error
    }
  },
  
  /**
   * Writes the vault to MongoDB
   * Automatically encrypts if encryption is enabled
   */
  async writeVault(vault: StoredVault): Promise<void> {
    try {
      const { collection } = await getMongoConnection()
      
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
      
      await collection.updateOne(
        { id: VAULT_ID },
        {
          $set: {
            id: VAULT_ID,
            encryptedVault,
            iv,
            salt: vault.salt || null,
            version: vault.version,
            lastModified: vault.lastModified || Date.now(),
            isOffline: vault.isOffline || false,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )
    } catch (error) {
      console.error('Error writing vault to MongoDB:', error)
      throw error
    }
  },
  
  /**
   * Closes the MongoDB connection
   */
  async close(): Promise<void> {
    if (client) {
      await client.close()
      client = null
      db = null
      collection = null
    }
  }
}
