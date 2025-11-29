/**
 * Tauri Updater Service
 * Handles desktop app auto-updates
 */

// Conditionally import Tauri updater (only available in desktop app)
let updaterCheck: any = null

export interface UpdateInfo {
  version: string
  date?: string
  body?: string
}

export interface UpdateStatus {
  available: boolean
  currentVersion: string
  latestVersion?: string
  updateInfo?: UpdateInfo
}

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  try {
    // Check if we're in Tauri environment and updater is available
    if (!updaterCheck && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        // @ts-ignore - Tauri plugin may not be available in web environment
        const updaterModule = await import('@tauri-apps/plugin-updater')
        updaterCheck = updaterModule.check
      } catch {
        return {
          available: false,
          currentVersion: 'unknown'
        }
      }
    }
    
    if (!updaterCheck) {
      return {
        available: false,
        currentVersion: 'unknown'
      }
    }
    
    const update = await updaterCheck()
    
    if (update?.available) {
      return {
        available: true,
        currentVersion: update.currentVersion,
        latestVersion: update.version,
        updateInfo: {
          version: update.version,
          body: update.body,
          date: update.date
        }
      }
    }
    
    return {
      available: false,
      currentVersion: update?.currentVersion || 'unknown'
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
    return {
      available: false,
      currentVersion: 'unknown'
    }
  }
}

/**
 * Install available update
 */
export async function installUpdate(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if we're in Tauri environment and updater is available
    if (!updaterCheck && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        // @ts-ignore - Tauri plugin may not be available in web environment
        const updaterModule = await import('@tauri-apps/plugin-updater')
        updaterCheck = updaterModule.check
      } catch {
        return { success: false, error: 'Updater not available' }
      }
    }
    
    if (!updaterCheck) {
      return { success: false, error: 'Updater not available' }
    }
    
    const update = await updaterCheck()
    
    if (!update?.available) {
      return { success: false, error: 'No update available' }
    }
    
    await update.downloadAndInstall()
    
    return { success: true }
  } catch (error: any) {
    console.error('Failed to install update:', error)
    return { success: false, error: error?.message || 'Update installation failed' }
  }
}

/**
 * Get changelog for update
 */
export function getUpdateChangelog(updateInfo?: UpdateInfo): string {
  if (!updateInfo?.body) {
    return `Update to version ${updateInfo?.version || 'latest'} is available.`
  }
  
  return updateInfo.body
}

