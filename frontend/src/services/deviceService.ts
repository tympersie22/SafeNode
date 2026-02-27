/**
 * Device Service
 * Handles device registration and management
 */
import { API_BASE } from '../config/api'

export interface Device {
  id: string
  deviceId: string
  name: string
  platform: 'web' | 'desktop' | 'mobile'
  lastSeen: number
  registeredAt: number
}

export interface RegisterDeviceInput {
  deviceId: string
  name: string
  platform: 'web' | 'desktop' | 'mobile'
}

/**
 * Generate a unique device ID for this browser/device
 */
export function generateDeviceId(): string {
  // Try to get existing device ID from localStorage
  let deviceId = localStorage.getItem('safenode_device_id')
  
  if (!deviceId) {
    // Generate a new device ID
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('safenode_device_id', deviceId)
  }
  
  return deviceId
}

/**
 * Get device name based on user agent
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent
  const platform = navigator.platform
  
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'iPhone/iPad'
  } else if (/Android/i.test(ua)) {
    return 'Android Device'
  } else if (/Mac/i.test(platform)) {
    return 'Mac'
  } else if (/Win/i.test(platform)) {
    return 'Windows PC'
  } else if (/Linux/i.test(platform)) {
    return 'Linux'
  }
  
  return 'Unknown Device'
}

/**
 * Detect platform type
 */
export function detectPlatform(): 'web' | 'desktop' | 'mobile' {
  const ua = navigator.userAgent
  
  if (/iPhone|iPad|iPod|Android/i.test(ua)) {
    return 'mobile'
  }
  
  // Check if running in Tauri (desktop)
  if (window.__TAURI__) {
    return 'desktop'
  }
  
  return 'web'
}

/**
 * Register current device
 */
export async function registerDevice(
  deviceId?: string,
  name?: string,
  platform?: 'web' | 'desktop' | 'mobile'
): Promise<Device> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const deviceData: RegisterDeviceInput = {
    deviceId: deviceId || generateDeviceId(),
    name: name || getDeviceName(),
    platform: platform || detectPlatform()
  }

  const response = await fetch(`${API_BASE}/api/devices/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(deviceData)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to register device')
  }

  const data = await response.json()
  return data.device
}

/**
 * Get all devices for current user
 */
export async function getDevices(): Promise<Device[]> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/devices`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch devices')
  }

  const data = await response.json()
  return data.devices
}

/**
 * Check device limit for current user
 */
export async function checkDeviceLimit(): Promise<{
  allowed: boolean
  current: number
  limit: number
  canAddMore: boolean
  remaining: number
}> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/devices/check-limit`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to check device limit')
  }

  return await response.json()
}

/**
 * Remove a device
 */
export async function removeDevice(deviceId: string): Promise<void> {
  const token = localStorage.getItem('safenode_token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE}/api/devices/${deviceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to remove device')
  }
}
