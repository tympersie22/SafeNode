/**
 * Device Management Settings Page
 * View and manage registered devices
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import {
  getDevices,
  removeDevice,
  Device,
  generateDeviceId,
  detectPlatform,
  registerCurrentDevice,
  approveDevice
} from '../../services/deviceService'
import { getCurrentUser } from '../../services/authService'
import { checkResourceLimit } from '../../services/billingService'
import { getAuditLogs, type RemoteAuditLog } from '../../services/auditService'

export const DevicesSettings: React.FC = () => {
  const navigate = useNavigate()
  const [devices, setDevices] = useState<Device[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<Device[]>([])
  const [securityEvents, setSecurityEvents] = useState<RemoteAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [limits, setLimits] = useState<{ current: number; limit: number } | null>(null)
  const [userPlan, setUserPlan] = useState<string>('free')

  useEffect(() => {
    void initializeDevices()
  }, [])

  const initializeDevices = async () => {
    try {
      const user = await getCurrentUser().catch(() => null)
      if (user?.id) {
        setUserPlan(user.subscriptionTier || 'free')
        await registerCurrentDevice(user.id).catch(() => undefined)
      }
    } finally {
      await Promise.all([loadDevices(), loadLimits(), loadSecurityEvents()])
    }
  }

  const loadDevices = async () => {
    try {
      setLoading(true)
      const overview = await getDevices()
      setDevices(overview.devices)
      setPendingApprovals(overview.pendingApprovals)
    } catch (err: any) {
      setError(err.message || 'Failed to load devices')
    } finally {
      setLoading(false)
    }
  }

  const loadSecurityEvents = async () => {
    try {
      const logs = await getAuditLogs({
        actions: ['device_access_denied', 'device_reapproval_required', 'device_reapproved', 'session_replaced', 'session_revoked'],
        limit: 10
      })
      setSecurityEvents(logs)
    } catch (err) {
      console.error('Failed to load security events:', err)
    }
  }

  const loadLimits = async () => {
    try {
      const limit = await checkResourceLimit('devices')
      setLimits(limit)
    } catch (err) {
      console.error('Failed to load device limits:', err)
    }
  }

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to remove this device?')) {
      return
    }

    setRemovingId(deviceId)
    setError(null)

    try {
      await removeDevice(deviceId)
      await Promise.all([loadDevices(), loadLimits(), loadSecurityEvents()])
    } catch (err: any) {
      setError(err.message || 'Failed to remove device')
    } finally {
      setRemovingId(null)
    }
  }

  const handleApproveDevice = async (deviceId: string) => {
    setApprovingId(deviceId)
    setError(null)

    try {
      await approveDevice(deviceId)
      await Promise.all([loadDevices(), loadSecurityEvents()])
    } catch (err: any) {
      setError(err.message || 'Failed to approve device')
    } finally {
      setApprovingId(null)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'mobile':
        return '📱'
      case 'desktop':
        return '💻'
      case 'web':
        return '🌐'
      default:
        return '🖥️'
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const formatSecurityAction = (action: string) => {
    switch (action) {
      case 'device_access_denied':
        return 'Vault access blocked'
      case 'device_reapproval_required':
        return 'Re-approval required'
      case 'device_reapproved':
        return 'Device re-approved'
      case 'session_replaced':
        return 'Older session ended'
      case 'session_revoked':
        return 'Session revoked'
      default:
        return action.replace(/_/g, ' ')
    }
  }

  const isCurrentDevice = (device: Device) => {
    const currentDeviceId = generateDeviceId()
    return device.deviceId === currentDeviceId && device.platform === detectPlatform()
  }

  const getUpgradePlan = () => {
    switch (userPlan) {
      case 'free':
        return { id: 'individual', name: 'Personal', deviceLimit: 5 }
      case 'pro':
      case 'individual':
        return { id: 'family', name: 'Family', deviceLimit: 10 }
      case 'family':
        return { id: 'teams', name: 'Teams', deviceLimit: 50 }
      default:
        return null
    }
  }

  const upgradePlan = getUpgradePlan()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          Device Management
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          View and manage devices that have access to your account
        </p>
      </div>

      {/* Device Limits */}
      {limits && (
        <SaasCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Active devices: <span className="font-semibold text-slate-900 dark:text-slate-100">{limits.current}</span>
                {limits.limit !== -1 && (
                  <> / <span className="font-semibold text-slate-900 dark:text-slate-100">{limits.limit}</span></>
                )}
              </p>
            </div>
            {limits.limit !== -1 && limits.current >= limits.limit && (
              <span className="text-xs font-medium text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 px-2 py-1 rounded">
                Limit reached
              </span>
            )}
          </div>
          {limits.limit !== -1 && limits.current >= limits.limit && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
              {upgradePlan ? (
                <div className="flex items-center justify-between gap-4">
                  <p>
                    Your current plan is full at {limits.current}/{limits.limit} devices. Upgrade to {upgradePlan.name} to increase your device limit to {upgradePlan.deviceLimit}.
                  </p>
                  <SaasButton variant="primary" size="sm" onClick={() => navigate('/billing')}>
                    Upgrade to {upgradePlan.name}
                  </SaasButton>
                </div>
              ) : (
                <p>
                  Your current plan is full at {limits.current}/{limits.limit} devices. Remove an existing device before accessing your vault from another device.
                </p>
              )}
            </div>
          )}
        </SaasCard>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl"
        >
          <p className="text-error-600 dark:text-error-400 text-sm font-medium">{error}</p>
        </motion.div>
      )}

      {/* Devices List */}
      {pendingApprovals.length > 0 && (
        <SaasCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pending Device Re-approval</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Removed devices stay blocked until you explicitly re-approve them from a trusted session.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {pendingApprovals.map((device) => (
              <div key={device.id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/10">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{device.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {device.platform} • Removed {device.removedAt ? formatDate(device.removedAt) : 'recently'}
                  </p>
                </div>
                <SaasButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleApproveDevice(device.id)}
                  isLoading={approvingId === device.id}
                >
                  Approve Again
                </SaasButton>
              </div>
            ))}
          </div>
        </SaasCard>
      )}

      {loading ? (
        <SaasCard>
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-secondary-500"></div>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Loading devices...</p>
          </div>
        </SaasCard>
      ) : devices.length === 0 ? (
        <SaasCard>
          <div className="text-center py-8">
            <p className="text-slate-600 dark:text-slate-400">No devices registered</p>
          </div>
        </SaasCard>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {devices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <SaasCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-3xl">{getPlatformIcon(device.platform)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {device.name}
                          </h3>
                          {isCurrentDevice(device) && (
                            <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400 bg-secondary-50 dark:bg-secondary-900/20 px-2 py-0.5 rounded">
                              Current Device
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                          {device.platform} • Last seen {formatDate(device.lastSeen)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          Registered {new Date(device.registeredAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {!isCurrentDevice(device) && (
                      <SaasButton
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRemoveDevice(device.id)}
                        isLoading={removingId === device.id}
                      >
                        Remove
                      </SaasButton>
                    )}
                  </div>
                </SaasCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <SaasCard>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Device Security Events</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Device access denials, forced sign-outs, and re-approval events from the server audit log.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {securityEvents.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No recent device security events.</p>
          ) : (
            securityEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{formatSecurityAction(event.action)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {event.metadata?.message || event.metadata?.deviceName || event.metadata?.deviceId || 'Security policy event'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-500">{formatDate(event.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </SaasCard>
    </div>
  )
}
