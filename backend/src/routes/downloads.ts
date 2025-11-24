/**
 * Downloads Routes
 * Handles download metadata and links for desktop, mobile, and browser extensions
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'

export interface DownloadPlatform {
  platform: 'macos' | 'windows' | 'linux' | 'ios' | 'android' | 'chrome' | 'firefox' | 'safari' | 'edge'
  name: string
  downloadUrl?: string
  storeUrl?: string
  version?: string
  releaseDate?: string
  fileSize?: string
  checksum?: string
}

// Download URLs - Replace with actual URLs when available
const DOWNLOAD_URLS: Record<string, DownloadPlatform> = {
  macos: {
    platform: 'macos',
    name: 'macOS',
    downloadUrl: process.env.DOWNLOAD_URL_MACOS || 'https://github.com/safenode/safenode-desktop/releases/latest/download/SafeNode-macOS.dmg',
    version: process.env.DESKTOP_VERSION || '1.0.0',
    releaseDate: process.env.DESKTOP_RELEASE_DATE || new Date().toISOString(),
    fileSize: '~50 MB',
    checksum: process.env.DESKTOP_MACOS_CHECKSUM || ''
  },
  windows: {
    platform: 'windows',
    name: 'Windows',
    downloadUrl: process.env.DOWNLOAD_URL_WINDOWS || 'https://github.com/safenode/safenode-desktop/releases/latest/download/SafeNode-Windows.exe',
    version: process.env.DESKTOP_VERSION || '1.0.0',
    releaseDate: process.env.DESKTOP_RELEASE_DATE || new Date().toISOString(),
    fileSize: '~60 MB',
    checksum: process.env.DESKTOP_WINDOWS_CHECKSUM || ''
  },
  linux: {
    platform: 'linux',
    name: 'Linux',
    downloadUrl: process.env.DOWNLOAD_URL_LINUX || 'https://github.com/safenode/safenode-desktop/releases/latest/download/SafeNode-Linux.AppImage',
    version: process.env.DESKTOP_VERSION || '1.0.0',
    releaseDate: process.env.DESKTOP_RELEASE_DATE || new Date().toISOString(),
    fileSize: '~55 MB',
    checksum: process.env.DESKTOP_LINUX_CHECKSUM || ''
  },
  ios: {
    platform: 'ios',
    name: 'iOS',
    storeUrl: process.env.DOWNLOAD_URL_IOS || 'https://apps.apple.com/app/safenode/id123456789',
    version: process.env.MOBILE_VERSION || '1.0.0',
    releaseDate: process.env.MOBILE_RELEASE_DATE || new Date().toISOString()
  },
  android: {
    platform: 'android',
    name: 'Android',
    storeUrl: process.env.DOWNLOAD_URL_ANDROID || 'https://play.google.com/store/apps/details?id=app.safenode',
    version: process.env.MOBILE_VERSION || '1.0.0',
    releaseDate: process.env.MOBILE_RELEASE_DATE || new Date().toISOString()
  },
  chrome: {
    platform: 'chrome',
    name: 'Chrome Extension',
    downloadUrl: process.env.DOWNLOAD_URL_CHROME || 'https://chrome.google.com/webstore/detail/safenode/abcdefghijklmnop',
    version: process.env.EXTENSION_VERSION || '1.0.0',
    releaseDate: process.env.EXTENSION_RELEASE_DATE || new Date().toISOString()
  },
  firefox: {
    platform: 'firefox',
    name: 'Firefox Extension',
    downloadUrl: process.env.DOWNLOAD_URL_FIREFOX || 'https://addons.mozilla.org/en-US/firefox/addon/safenode/',
    version: process.env.EXTENSION_VERSION || '1.0.0',
    releaseDate: process.env.EXTENSION_RELEASE_DATE || new Date().toISOString()
  },
  safari: {
    platform: 'safari',
    name: 'Safari Extension',
    downloadUrl: process.env.DOWNLOAD_URL_SAFARI || 'https://apps.apple.com/app/safenode-safari-extension/id123456789',
    version: process.env.EXTENSION_VERSION || '1.0.0',
    releaseDate: process.env.EXTENSION_RELEASE_DATE || new Date().toISOString()
  },
  edge: {
    platform: 'edge',
    name: 'Edge Extension',
    downloadUrl: process.env.DOWNLOAD_URL_EDGE || 'https://microsoftedge.microsoft.com/addons/detail/safenode/abcdefghijklmnop',
    version: process.env.EXTENSION_VERSION || '1.0.0',
    releaseDate: process.env.EXTENSION_RELEASE_DATE || new Date().toISOString()
  }
}

/**
 * Detect platform from user agent
 */
function detectPlatform(userAgent?: string): 'macos' | 'windows' | 'linux' | 'ios' | 'android' | null {
  if (!userAgent) return null

  const ua = userAgent.toLowerCase()
  
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'ios'
  }
  
  if (ua.includes('android')) {
    return 'android'
  }
  
  if (ua.includes('mac os x') || ua.includes('macintosh')) {
    return 'macos'
  }
  
  if (ua.includes('windows')) {
    return 'windows'
  }
  
  if (ua.includes('linux') || ua.includes('x11')) {
    return 'linux'
  }
  
  return null
}

/**
 * Register download routes
 */
export async function registerDownloadRoutes(server: FastifyInstance) {
  /**
   * GET /api/downloads/latest
   * Get latest download URLs for all platforms or a specific platform
   * Query params: ?platform=macos|windows|linux|ios|android|chrome|firefox|safari|edge
   */
  server.get('/api/downloads/latest', async (request, reply) => {
    try {
      const { platform } = request.query as { platform?: string }
      const userAgent = request.headers['user-agent']

      if (platform) {
        // Return specific platform
        const platformKey = platform.toLowerCase() as keyof typeof DOWNLOAD_URLS
        const downloadInfo = DOWNLOAD_URLS[platformKey]

        if (!downloadInfo) {
          return reply.code(400).send({
            error: 'invalid_platform',
            message: `Platform "${platform}" is not supported. Supported platforms: ${Object.keys(DOWNLOAD_URLS).join(', ')}`
          })
        }

        return {
          platform: downloadInfo,
          suggested: downloadInfo.platform === detectPlatform(userAgent)
        }
      }

      // Auto-detect platform if not specified
      const detectedPlatform = detectPlatform(userAgent)
      const suggested = detectedPlatform ? DOWNLOAD_URLS[detectedPlatform] : null

      return {
        platforms: Object.values(DOWNLOAD_URLS),
        suggested: suggested || null,
        detectedPlatform: detectedPlatform || null
      }
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch download information'
      })
    }
  })

  /**
   * GET /api/downloads/:platform
   * Get download info for a specific platform
   */
  server.get('/api/downloads/:platform', async (request, reply) => {
    try {
      const { platform } = request.params as { platform: string }
      const platformKey = platform.toLowerCase() as keyof typeof DOWNLOAD_URLS
      const downloadInfo = DOWNLOAD_URLS[platformKey]

      if (!downloadInfo) {
        return reply.code(404).send({
          error: 'platform_not_found',
          message: `Platform "${platform}" is not supported`
        })
      }

      return downloadInfo
    } catch (error: any) {
      request.log.error(error)
      return reply.code(500).send({
        error: error?.message || 'server_error',
        message: 'Failed to fetch download information'
      })
    }
  })
}

