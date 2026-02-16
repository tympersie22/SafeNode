/**
 * Downloads Page
 * Marketing page for downloading SafeNode on different platforms
 */

import React, { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'
import { getLatestDownloads } from '../../services/downloadService'

// Detect user's platform with better accuracy
const detectPlatform = (): 'android' | 'ios' | 'windows' | 'macos' | 'linux' | null => {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  
  // Check for mobile first
  if (/android/i.test(ua)) return 'android'
  
  // iOS detection (more accurate)
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
  // Also check for iOS 13+ on iPad
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (isIOS || isIPadOS) return 'ios'
  
  // Desktop platforms
  if (/Win/.test(ua) || /Windows/.test(ua)) return 'windows'
  if (/Mac/.test(ua) || /Macintosh/.test(ua)) return 'macos'
  if (/Linux/.test(ua) && !/Android/.test(ua)) return 'linux'
  
  return null
}

const PLATFORMS = [
  {
    name: 'Web App',
    icon: '🌐',
    description: 'Access SafeNode instantly in your browser',
    status: 'Available Now',
    downloadUrl: '/auth?mode=signup',
    features: ['No installation required', 'Works on any device', 'PWA support', 'Offline capability']
  },
  {
    name: 'Desktop App',
    icon: '💻',
    description: 'Native apps for Mac, Windows, and Linux',
    status: 'Available Now',
    downloadUrl: '#',
    features: ['macOS Keychain integration', 'Windows Credential Manager', 'System tray', 'Auto-lock timer'],
    downloads: [
      { 
        platform: 'macOS', 
        url: 'https://github.com/safenode/safenode/releases/latest/download/SafeNode-macos.dmg',
        icon: '🍎',
        arch: 'x64' 
      },
      { 
        platform: 'Windows', 
        url: 'https://github.com/safenode/safenode/releases/latest/download/SafeNode-windows-x64.exe',
        icon: '🪟',
        arch: 'x64'
      },
      { 
        platform: 'Linux', 
        url: 'https://github.com/safenode/safenode/releases/latest/download/SafeNode-linux-x86_64.AppImage',
        icon: '🐧',
        arch: 'x64'
      }
    ]
  },
  {
    name: 'Mobile App',
    icon: '📱',
    description: 'iOS and Android apps with biometric unlock',
    status: 'Available Now',
    downloadUrl: '#',
    features: ['Face ID / Touch ID', 'Offline vault', 'Biometric unlock', 'Quick access widget'],
    downloads: [
      { 
        platform: 'iOS', 
        url: 'https://apps.apple.com/app/safenode/id1234567890',
        icon: '🍎', 
        badge: 'App Store' 
      },
      { 
        platform: 'Android', 
        url: 'https://play.google.com/store/apps/details?id=com.safenode.app',
        icon: '🤖', 
        badge: 'Play Store' 
      }
    ]
  },
  {
    name: 'Browser Extension',
    icon: '🔌',
    description: 'Auto-fill passwords in your browser',
    status: 'Available Now',
    downloadUrl: '#',
    features: ['Auto-fill passwords', 'Quick access', 'Secure browser integration', 'Cross-browser support'],
    downloads: [
      { 
        platform: 'Chrome', 
        url: 'https://chrome.google.com/webstore/detail/safenode/abcdefghijklmnopqrstuvwxyz123456',
        icon: '🌐' 
      },
      { 
        platform: 'Firefox', 
        url: 'https://addons.mozilla.org/en-US/firefox/addon/safenode/',
        icon: '🦊' 
      },
      { 
        platform: 'Safari', 
        url: 'https://apps.apple.com/app/safenode-extension/id1234567891',
        icon: '🧭' 
      },
      { 
        platform: 'Edge', 
        url: 'https://microsoftedge.microsoft.com/addons/detail/safenode/abcdefghijklmnopqrstuvwxyz123457',
        icon: '🌊' 
      }
    ]
  }
]

export const DownloadsPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const userPlatform = detectPlatform()
  const [downloadInfo, setDownloadInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch download info from API
  useEffect(() => {
    const fetchDownloadInfo = async () => {
      try {
        setIsLoading(true)
        const info = await getLatestDownloads(userPlatform || undefined)
        setDownloadInfo(info)
      } catch (error) {
        console.error('Failed to fetch download info:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDownloadInfo()
  }, [userPlatform])

  // Get recommended download for user's platform
  const getRecommendedDownload = () => {
    if (downloadInfo?.suggested) {
      return downloadInfo.suggested
    }
    if (!userPlatform) return null
    
    // Mobile platforms
    if (userPlatform === 'ios') {
      const mobilePlatform = PLATFORMS.find(p => p.name === 'Mobile App')
      return mobilePlatform?.downloads?.find(d => d.platform === 'iOS') || null
    }
    if (userPlatform === 'android') {
      const mobilePlatform = PLATFORMS.find(p => p.name === 'Mobile App')
      return mobilePlatform?.downloads?.find(d => d.platform === 'Android') || null
    }
    
    // Desktop platforms
    const desktopPlatform = PLATFORMS.find(p => p.name === 'Desktop App')
    if (!desktopPlatform?.downloads) return null
    
    if (userPlatform === 'macos') {
      return desktopPlatform.downloads.find(d => d.platform === 'macOS')
    } else if (userPlatform === 'windows') {
      return desktopPlatform.downloads.find(d => d.platform === 'Windows')
    } else if (userPlatform === 'linux') {
      return desktopPlatform.downloads.find(d => d.platform === 'Linux')
    }
    return null
  }

  const recommendedDownload = getRecommendedDownload()

  // Check if a download URL is available (not placeholder)
  const isDownloadAvailable = (url: string): boolean => {
    if (!url || url.trim() === '') return false
    if (url.startsWith('#') || url === '#') return false
    if (url.includes('placeholder')) return false
    
    // Check for placeholder IDs
    if (url.includes('apps.apple.com') && (url.includes('id1234567890') || url.includes('id1234567891'))) return false
    if (url.includes('play.google.com') && url.includes('id=com.safenode.app')) return false
    if (url.includes('chrome.google.com') && url.includes('abcdefghijklmnopqrstuvwxyz')) return false
    if (url.includes('microsoftedge.microsoft.com') && url.includes('abcdefghijklmnopqrstuvwxyz')) return false
    if (url.includes('addons.mozilla.org') && url.includes('placeholder')) return false
    
    // GitHub releases URLs are valid even if file doesn't exist yet (they'll 404 but that's OK)
    if (url.includes('github.com') && url.includes('releases/latest')) {
      return true
    }
    
    // Valid URLs that don't match placeholder patterns
    return true
  }

  // Check if platform is coming soon
  const isComingSoon = (platform: typeof PLATFORMS[0]) => {
    if (platform.status !== 'Available Now') return true
    if (!platform.downloads) return false
    return platform.downloads.every(d => !isDownloadAvailable(d.url))
  }

  // Get button state for download
  const getDownloadButtonState = (url: string, platformStatus: string) => {
    const available = isDownloadAvailable(url)
    if (!available || platformStatus !== 'Available Now') {
      return { 
        disabled: true, 
        text: 'Coming Soon', 
        className: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-60',
        onClick: (e: React.MouseEvent) => e.preventDefault()
      }
    }
    return { 
      disabled: false, 
      text: 'Download', 
      className: 'bg-secondary-600 hover:bg-secondary-700 text-white',
      onClick: undefined
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav 
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Logo variant="nav" />
              <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">
                  SafeNode
                </h1>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium">
                Back to Home
              </Link>
              <motion.button
                onClick={() => window.location.href = '/#auth'}
                className="px-5 py-2.5 bg-gradient-to-r from-secondary-600 to-secondary-500 hover:from-secondary-700 hover:to-secondary-600 text-white text-sm font-semibold rounded-lg transition-all duration-200"
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                Get Started
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Header */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Download SafeNode
            </motion.h1>
            <motion.p
              className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Access your secure vault on any device, anywhere. Your data syncs seamlessly across all platforms.
            </motion.p>
            {recommendedDownload && isDownloadAvailable(recommendedDownload.url) && (
              <motion.div
                className="mt-8"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <motion.a
                  href={recommendedDownload.url}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-secondary-600 to-secondary-500 hover:from-secondary-700 hover:to-secondary-600 text-white text-lg font-semibold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  aria-label={`Download SafeNode for ${recommendedDownload.platform}`}
                >
                  <span className="text-2xl">{recommendedDownload.icon}</span>
                  <span>Download for {recommendedDownload.platform}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </motion.a>
              </motion.div>
            )}
          </div>
        </section>

        {/* Platform Cards */}
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {PLATFORMS.map((platform, index) => (
                <motion.div
                  key={index}
                  className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-8"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={prefersReducedMotion ? {} : { y: -4 }}
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="text-5xl">{platform.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                          {platform.name}
                        </h3>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          platform.status === 'Available Now'
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        }`}>
                          {platform.status}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        {platform.description}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {platform.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <svg className="w-4 h-4 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Coming Soon Banner */}
                  {isComingSoon(platform) && (
                    <motion.div 
                      className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>Coming soon - download links will be available after release</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Download Buttons */}
                  {platform.downloads ? (
                    <div className="space-y-3">
                      {platform.downloads.map((download, idx) => {
                        const buttonState = getDownloadButtonState(download.url, platform.status)
                        const isAvailable = isDownloadAvailable(download.url)
                        return (
                          <motion.button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              if (buttonState.disabled || !isAvailable) {
                                e.preventDefault()
                                return
                              }
                              // Open download in new tab
                              window.open(download.url, '_blank', 'noopener,noreferrer')
                            }}
                            disabled={buttonState.disabled}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${buttonState.className}`}
                            whileHover={!buttonState.disabled && !prefersReducedMotion ? { scale: 1.02 } : {}}
                            whileTap={!buttonState.disabled && !prefersReducedMotion ? { scale: 0.98 } : {}}
                            aria-disabled={buttonState.disabled}
                            aria-label={`Download SafeNode for ${download.platform}`}
                          >
                            <span>{download.icon}</span>
                            <span>{buttonState.text} for {download.platform}</span>
                            {(download as any).badge && <span className="text-xs opacity-75">({(download as any).badge})</span>}
                            {buttonState.disabled && (
                              <span className="text-xs ml-1 opacity-75">(Coming Soon)</span>
                            )}
                          </motion.button>
                        )
                      })}
                    </div>
                  ) : (
                    <motion.button
                      onClick={() => {
                        if (platform.status === 'Available Now') {
                          if (platform.downloadUrl.startsWith('/')) {
                            window.location.href = platform.downloadUrl
                          } else {
                            window.location.href = '/#auth'
                          }
                        }
                      }}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                        platform.status === 'Available Now'
                          ? 'bg-gradient-to-r from-secondary-600 to-secondary-500 hover:from-secondary-700 hover:to-secondary-600 text-white shadow-safenode-secondary'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                      }`}
                      whileHover={platform.status === 'Available Now' && !prefersReducedMotion ? { scale: 1.02 } : {}}
                      whileTap={platform.status === 'Available Now' && !prefersReducedMotion ? { scale: 0.98 } : {}}
                      disabled={platform.status !== 'Available Now'}
                    >
                      {platform.status === 'Available Now' ? 'Get Started' : 'Coming Soon'}
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Sync Info */}
        <section className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
              whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
                Universal Sync
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                Your encrypted vault syncs automatically across all your devices. 
                Add a password on your phone, access it instantly on your desktop. 
                All with end-to-end encryption.
              </p>
              <div className="flex items-center justify-center gap-8 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Real-time sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Offline support</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-secondary-600 via-secondary-500 to-secondary-600 dark:from-secondary-700 dark:via-secondary-600 dark:to-secondary-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h2
              className="text-4xl md:text-5xl font-extrabold text-white mb-6"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Start Using SafeNode Today
            </motion.h2>
            <motion.button
              onClick={() => window.location.href = '/#auth'}
              className="px-8 py-4 bg-white hover:bg-slate-50 text-secondary-600 dark:text-secondary-700 text-lg font-semibold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl"
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            >
              Get Started Free
            </motion.button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default DownloadsPage

