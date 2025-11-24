/**
 * Download Service
 * Handles download metadata and platform detection
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

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

export interface DownloadInfo {
  platforms: DownloadPlatform[]
  suggested: DownloadPlatform | null
  detectedPlatform: 'macos' | 'windows' | 'linux' | 'ios' | 'android' | null
}

/**
 * Get latest download information for all platforms
 */
export async function getLatestDownloads(platform?: string): Promise<DownloadInfo | DownloadPlatform> {
  const url = platform 
    ? `${API_BASE}/api/downloads/${platform}`
    : `${API_BASE}/api/downloads/latest`

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch download information')
  }

  return await response.json()
}

/**
 * Get download URL for a specific platform
 */
export async function getPlatformDownloadUrl(platform: string): Promise<string | null> {
  try {
    const info = await getLatestDownloads(platform) as DownloadPlatform
    return info.downloadUrl || info.storeUrl || null
  } catch (error) {
    console.error('Failed to get download URL:', error)
    return null
  }
}

