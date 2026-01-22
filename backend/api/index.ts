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
    // Initialize database adapter
    await adapter.init()
    
    // Create Fastify app
    app = await createApp()
    isInitialized = true
  }
  return app
}

export default async function handler(req: any, res: any) {
  try {
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
    console.error('Vercel handler error:', error)
    console.error('Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
