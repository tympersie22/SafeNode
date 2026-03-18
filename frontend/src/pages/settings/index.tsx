/**
 * Settings Page
 * Main settings page with tabs for different sections
 */

import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { SaasTabs, Tab } from '../../ui/SaasTabs'
import { SecuritySettings } from './Security'
import { DevicesSettings } from './Devices'
import { BillingSettings } from './Billing'
import { PrivacySettings } from './Privacy'
import { DataSettings } from './Data'
import { AdvancedSettings } from './Advanced'
import { AccountSettings } from './Account'
import { ReportsSettings } from './Reports'

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const tabFromQuery = React.useMemo(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    return tab || 'security'
  }, [location.search])

  // Memoised so the array reference is stable across renders — prevents the
  // SaasTabs useEffect from firing on every render and resetting the active tab.
  const tabs: Tab[] = React.useMemo(() => [
    { id: 'security', label: 'Security', icon: '🔒', content: <SecuritySettings /> },
    { id: 'privacy', label: 'Privacy', icon: '🛡️', content: <PrivacySettings /> },
    { id: 'data', label: 'Data', icon: '💾', content: <DataSettings /> },
    { id: 'devices', label: 'Devices', icon: '🖥️', content: <DevicesSettings /> },
    { id: 'advanced', label: 'Advanced', icon: '⚙️', content: <AdvancedSettings /> },
    { id: 'reports', label: 'Reports', icon: '📊', content: <ReportsSettings /> },
    { id: 'account', label: 'Account', icon: '👤', content: <AccountSettings /> },
    { id: 'billing', label: 'Billing', icon: '💳', content: <BillingSettings /> }
  ], [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Settings
          </h1>
              <p className="text-slate-600 dark:text-slate-400">
            Manage your account settings and preferences
          </p>
            </div>
            <motion.button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ← Back to Vault
            </motion.button>
          </div>
        </motion.div>

        <SaasTabs
          tabs={tabs}
          defaultTab={tabFromQuery}
          onChange={(id) => navigate(`/settings?tab=${id}`, { replace: true })}
          className="mb-8"
        />
      </div>
    </div>
  )
}
