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
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false,
        timeout: 15000,
        proxyTimeout: 15000,
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
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-core'
            }
            if (id.includes('/react-router/') || id.includes('/react-router-dom/')) {
              return 'router'
            }
            if (id.includes('/framer-motion/')) {
              return 'motion'
            }
            if (id.includes('/lucide-react/')) {
              return 'icons'
            }
            if (id.includes('/@tensorflow/')) {
              return 'tensorflow'
            }
            if (id.includes('/hash-wasm/')) {
              return 'crypto-vendor'
            }
            if (id.includes('/react-hot-toast/')) {
              return 'toast'
            }
            return 'vendor-misc'
          }
        }
      }
    },
    chunkSizeWarningLimit: 700,
    sourcemap: false
  }
})
