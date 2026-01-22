/**
 * Vercel Serverless Function Entry Point
 * Wraps the Fastify app for Vercel deployment
 */

import { createApp } from '../src/app'
import { adapter } from '../src/adapters'
import { config } from '../src/config'

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
  try {
    console.log(`📥 Request: ${req.method} ${req.url}`)
    
    const fastifyApp = await getApp()
    
    // Convert Vercel request to Fastify-compatible format
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    
    // Handle the request with Fastify
    const response = await fastifyApp.inject({
      method: req.method || 'GET',
      url: url.pathname + url.search,
      headers: req.headers || {},
      payload: req.body,
      query: Object.fromEntries(url.searchParams)
    })
    
    // Set headers
    Object.keys(response.headers).forEach(key => {
      res.setHeader(key, response.headers[key])
    })
    
    // Set status
    res.status(response.statusCode)
    
    // Send response
    return res.send(response.payload)
  } catch (error: any) {
    console.error('❌ Vercel handler error:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    console.error('Error stack:', error.stack)
    
    // Check if it's a database connection error
    if (error.message?.includes('DATABASE_URL') || error.message?.includes('database')) {
      console.error('🔴 Database connection error detected')
      return res.status(500).json({ 
        error: 'Database connection failed', 
        message: 'Unable to connect to database. Please check DATABASE_URL environment variable.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
