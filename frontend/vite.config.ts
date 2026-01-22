// SOLUTION 2: Vite proxy that removes CORS completely during development
// Remove this proxy config in production (use proper CORS instead)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        // Forward cookies and credentials
        cookieDomainRewrite: '',
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie)
            }
          })
        }
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion'
            }
            if (id.includes('hash-wasm') || id.includes('crypto')) {
              return 'crypto-vendor'
            }
            // Other node_modules go into vendor chunk
            return 'vendor'
          }
          // Large feature chunks
          if (id.includes('/src/crypto/')) {
            return 'crypto'
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB for large dependencies
    sourcemap: false // Disable sourcemaps in production for smaller builds
  }
})


