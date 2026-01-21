/**
 * Advanced Settings Page
 * Developer mode, log export, experimental features
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { Code, FileText, Settings } from 'lucide-react'

export const AdvancedSettings: React.FC = () => {
  const [developerMode, setDeveloperMode] = useState(false)
  const [exportingLogs, setExportingLogs] = useState(false)

  useEffect(() => {
    const devMode = localStorage.getItem('safenode_developer_mode') === 'true'
    setDeveloperMode(devMode)
  }, [])

  const handleToggleDeveloperMode = () => {
    const newValue = !developerMode
    setDeveloperMode(newValue)
    localStorage.setItem('safenode_developer_mode', newValue.toString())
    
    if (newValue) {
      console.log('Developer mode enabled')
    } else {
      console.log('Developer mode disabled')
    }
  }

  const handleExportLogs = () => {
    setExportingLogs(true)
    try {
      // Collect console logs (if available)
      const logs = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        consoleLogs: [] as any[],
        errors: [] as any[]
      }

      // Export as JSON
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `safenode-logs-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Logs exported successfully')
    } catch (error: any) {
      console.error('Failed to export logs:', error)
      alert('Failed to export logs: ' + error.message)
    } finally {
      setExportingLogs(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Advanced Settings
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Developer tools and experimental features
        </p>
      </div>

      {/* Developer Mode */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Developer Mode
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Enable additional debugging information and developer tools
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                ⚠️ Developer mode may expose sensitive debugging information. Use with caution.
              </p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={developerMode}
                onChange={handleToggleDeveloperMode}
                className="w-4 h-4 text-secondary-600 rounded focus:ring-secondary-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Enable developer mode
              </span>
            </label>
          </div>
        </div>
      </SaasCard>

      {/* Log Export */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Export Logs
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Export application logs for debugging and support
            </p>
            <SaasButton
              variant="outline"
              onClick={handleExportLogs}
              isLoading={exportingLogs}
            >
              Export Logs
            </SaasButton>
          </div>
        </div>
      </SaasCard>

      {/* Version Info */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Version Information
            </h3>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>SafeNode v1.0.0</p>
              <p>Build: {process.env.REACT_APP_BUILD_DATE || 'Development'}</p>
              <p>Environment: {process.env.NODE_ENV || 'development'}</p>
            </div>
          </div>
        </div>
      </SaasCard>
    </div>
  )
}
