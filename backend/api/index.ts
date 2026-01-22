/**
 * Vercel Serverless Function Entry Point
 * Wraps the Fastify app for Vercel deployment
 */

import { createApp } from '../src/app'
import { adapter } from '../src/adapters'
import { config } from '../src/config'
import { seedDatabase } from '../src/db/seed'

let app: any = null
let isInitialized = false

async function getApp() {
  if (!isInitialized) {
    try {
      console.log('🚀 Initializing SafeNode backend...')
      console.log('📦 Environment:', process.env.NODE_ENV || 'development')
      console.log('💾 Database adapter:', process.env.DB_ADAPTER || 'file')
      
      // Initialize database adapter
      console.log('🔌 Connecting to database...')
      await adapter.init()
      console.log('✅ Database connected')
      
      // Seed database if needed (development or if FORCE_SEED=true)
      const forceSeed = process.env.FORCE_SEED === 'true'
      const seedOnBoot = process.env.SEED_ON_BOOT === 'true'
      if (config.nodeEnv === 'development' || seedOnBoot || forceSeed) {
        console.log('🌱 Seeding database...')
        try {
          await seedDatabase()
          console.log('✅ Database seeding completed')
        } catch (seedError: any) {
          console.error('⚠️  Database seeding failed (non-fatal):', seedError.message)
          // Don't throw - allow app to start even if seeding fails
        }
      }
      
      // Create Fastify app
      console.log('🔧 Creating Fastify app...')
      app = await createApp()
      console.log('✅ Fastify app created')
      
      isInitialized = true
      console.log('✅ Backend initialized successfully')
    } catch (error: any) {
      console.error('❌ Failed to initialize backend:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      throw error
    }
  }
  return app
}

export default async function handler(req: any, res: any) {
  // Ensure we always send a response
  let responseSent = false
  
  const sendError = (status: number, error: any) => {
    if (responseSent) return
    responseSent = true
    
    console.error('❌ Sending error response:', status, error.message)
    return res.status(status).json({
      error: error.error || 'Internal server error',
      message: error.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && error.stack ? { stack: error.stack } : {})
    })
  }
  
  try {
    console.log(`📥 Request: ${req.method} ${req.url}`)
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2))
    
    let fastifyApp
    try {
      fastifyApp = await getApp()
    } catch (initError: any) {
      console.error('❌ Failed to get app:', initError)
      return sendError(500, {
        error: 'Initialization failed',
        message: initError.message || 'Failed to initialize application',
        stack: initError.stack
      })
    }
    
    if (!fastifyApp) {
      return sendError(500, {
        error: 'App not available',
        message: 'Fastify app was not initialized'
      })
    }
    
    // Convert Vercel request to Fastify-compatible format
    let url: URL
    try {
      url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`)
    } catch (urlError: any) {
      console.error('❌ Invalid URL:', req.url)
      return sendError(400, {
        error: 'Invalid request URL',
        message: urlError.message
      })
    }
    
    // Handle the request with Fastify
    let response
    try {
      response = await fastifyApp.inject({
        method: req.method || 'GET',
        url: url.pathname + url.search,
        headers: req.headers || {},
        payload: req.body,
        query: Object.fromEntries(url.searchParams)
      })
    } catch (injectError: any) {
      console.error('❌ Fastify inject error:', injectError)
      return sendError(500, {
        error: 'Request processing failed',
        message: injectError.message || 'Failed to process request',
        stack: injectError.stack
      })
    }
    
    if (responseSent) return
    
    // Set headers
    if (response.headers) {
      Object.keys(response.headers).forEach(key => {
        try {
          res.setHeader(key, response.headers[key])
        } catch (headerError) {
          console.warn('⚠️ Failed to set header:', key, headerError)
        }
      })
    }
    
    // Set status
    res.status(response.statusCode || 200)
    
    // Send response
    responseSent = true
    return res.send(response.payload)
    
  } catch (error: any) {
    console.error('❌ Unhandled error in handler:', error)
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error stack:', error?.stack)
    
    if (!responseSent) {
      // Check if it's a database connection error
      if (error?.message?.includes('DATABASE_URL') || error?.message?.includes('database') || error?.code === 'P1001') {
        console.error('🔴 Database connection error detected')
        return sendError(500, {
          error: 'Database connection failed',
          message: 'Unable to connect to database. Please check DATABASE_URL environment variable.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      }
      
      return sendError(500, {
        error: 'Internal server error',
        message: error?.message || 'An unexpected error occurred',
        stack: error?.stack
      })
    }
  }
}
