/**
 * Vercel Serverless Function Entry Point
 * Wraps the Fastify app for Vercel deployment
 */

import { createApp } from '../app'
import { adapter } from '../adapters'
import { config } from '../config'

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
    const url = new URL(req.url, `http://${req.headers.host}`)
    
    // Handle the request with Fastify
    await fastifyApp.inject({
      method: req.method,
      url: url.pathname + url.search,
      headers: req.headers,
      payload: req.body,
      query: Object.fromEntries(url.searchParams)
    }).then((response: any) => {
      // Set headers
      Object.keys(response.headers).forEach(key => {
        res.setHeader(key, response.headers[key])
      })
      
      // Set status
      res.status(response.statusCode)
      
      // Send response
      res.send(response.payload)
    })
  } catch (error: any) {
    console.error('Vercel handler error:', error)
    res.status(500).json({ error: 'Internal server error', message: error.message })
  }
}
