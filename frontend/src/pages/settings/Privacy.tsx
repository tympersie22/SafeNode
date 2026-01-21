/**
 * Privacy Settings Page
 * Manage privacy preferences, clipboard timeout, auto-lock, breach notifications
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { Shield, Clock, Bell, Eye } from 'lucide-react'

export const PrivacySettings: React.FC = () => {
  const [clipboardTimeout, setClipboardTimeout] = useState(30) // seconds
  const [autoLockEnabled, setAutoLockEnabled] = useState(true)
  const [autoLockMinutes, setAutoLockMinutes] = useState(30)
  const [breachNotifications, setBreachNotifications] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    // Load settings from localStorage
    const savedClipboardTimeout = localStorage.getItem('safenode_clipboard_timeout')
    const savedAutoLock = localStorage.getItem('safenode_auto_lock_enabled')
    const savedAutoLockMinutes = localStorage.getItem('safenode_auto_lock_minutes')
    const savedBreachNotifications = localStorage.getItem('safenode_breach_notifications')

    if (savedClipboardTimeout) setClipboardTimeout(parseInt(savedClipboardTimeout, 10))
    if (savedAutoLock) setAutoLockEnabled(savedAutoLock === 'true')
    if (savedAutoLockMinutes) setAutoLockMinutes(parseInt(savedAutoLockMinutes, 10))
    if (savedBreachNotifications) setBreachNotifications(savedBreachNotifications === 'true')
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)

    try {
      // Save to localStorage
      localStorage.setItem('safenode_clipboard_timeout', clipboardTimeout.toString())
      localStorage.setItem('safenode_auto_lock_enabled', autoLockEnabled.toString())
      localStorage.setItem('safenode_auto_lock_minutes', autoLockMinutes.toString())
      localStorage.setItem('safenode_breach_notifications', breachNotifications.toString())

      setSuccess('Privacy settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Failed to save privacy settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Privacy Settings
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your privacy preferences and data handling
        </p>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
        >
          <p className="text-green-600 dark:text-green-400 text-sm font-medium">{success}</p>
        </motion.div>
      )}

      {/* Clipboard Timeout */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Clipboard Timeout
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Automatically clear copied passwords from clipboard after a set time
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={clipboardTimeout}
                onChange={(e) => setClipboardTimeout(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[60px]">
                {clipboardTimeout}s
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Passwords will be cleared from clipboard after {clipboardTimeout} seconds
            </p>
          </div>
        </div>
      </SaasCard>

      {/* Auto-Lock Settings */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Auto-Lock
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Automatically lock your vault after a period of inactivity
            </p>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLockEnabled}
                  onChange={(e) => setAutoLockEnabled(e.target.checked)}
                  className="w-4 h-4 text-secondary-600 rounded focus:ring-secondary-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Enable auto-lock</span>
              </label>
              {autoLockEnabled && (
                <div className="ml-7">
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Lock after (minutes):
                  </label>
                  <select
                    value={autoLockMinutes}
                    onChange={(e) => setAutoLockMinutes(parseInt(e.target.value, 10))}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </SaasCard>

      {/* Breach Notifications */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Breach Notifications
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Get notified when your accounts appear in data breaches
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={breachNotifications}
                onChange={(e) => setBreachNotifications(e.target.checked)}
                className="w-4 h-4 text-secondary-600 rounded focus:ring-secondary-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Enable breach notifications
              </span>
            </label>
          </div>
        </div>
      </SaasCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <SaasButton variant="primary" onClick={handleSave} isLoading={saving}>
          Save Privacy Settings
        </SaasButton>
      </div>
    </div>
  )
}
