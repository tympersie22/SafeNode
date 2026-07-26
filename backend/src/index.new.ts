/**
 * Safenode Backend Entry Point
 * Initializes the server with adapters, graceful shutdown, and error handling
 */

import { createApp } from './app'
import { adapter } from './adapters'
import { config } from './config'
import { seedDatabase } from './db/seed'
import { initSentry } from './services/sentryService'

// Graceful shutdown handler
let server: any = null

async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`)
  
  if (server) {
    await server.close()
  }
  
  // Close database connections
  try {
    await adapter.close()
    console.log('✅ Database connections closed')
  } catch (error) {
    console.error('❌ Error closing database connections:', error)
  }
  
  process.exit(0)
}

// Register shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

/**
 * Start the server
 */
async function start() {
  try {
    // Initialize observability before database and route startup failures can occur.
    initSentry()
    console.log('🚀 Starting Safenode backend...')
    console.log(`📦 Environment: ${config.nodeEnv}`)
    console.log(`💾 Database adapter: ${config.dbAdapter}`)
    
    // Initialize database adapter
    console.log('🔌 Connecting to database...')
    await adapter.init()
    
    // Seed database if needed (development or if SEED_ON_BOOT=true)
    if (config.nodeEnv === 'development' || process.env.SEED_ON_BOOT === 'true') {
      console.log('🌱 Seeding database...')
      await seedDatabase()
      console.log('✅ Database seeding completed')
    }
    
    // Create Fastify app
    const app = await createApp()
    
    // Start server
    const address = await app.listen({
      port: config.port,
      host: '0.0.0.0'
    })
    
    server = app
    
    console.log(`✅ Server listening on ${address}`)
    console.log(`📚 API documentation available at ${address}/docs`)
    console.log(`🏥 Health check: ${address}/health`)
    
    if (config.nodeEnv === 'development') {
      console.log('\n💡 Development mode enabled')
      console.log('   - Detailed logging enabled')
      console.log('   - CORS allows localhost origins')
    }
    
    if (config.nodeEnv === 'production') {
      console.log('\n🔒 Production mode enabled')
      console.log('   - Security headers enabled')
      console.log('   - Rate limiting active')
      if (config.encryptionKey) {
        console.log('   - Encryption at rest enabled')
      } else {
        console.log('   ⚠️  WARNING: Encryption at rest disabled (ENCRYPTION_KEY not set)')
      }
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
start()
