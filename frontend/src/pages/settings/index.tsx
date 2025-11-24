/**
 * Settings Page
 * Main settings page with tabs for different sections
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { SaasTabs, Tab } from '../../ui/SaasTabs'
import { SecuritySettings } from './Security'
import { DevicesSettings } from './Devices'
import { BillingSettings } from './Billing'

export const SettingsPage: React.FC = () => {
  const tabs: Tab[] = [
    { id: 'security', label: 'Security', icon: '🔒', content: <SecuritySettings /> },
    { id: 'devices', label: 'Devices', icon: '🖥️', content: <DevicesSettings /> },
    { id: 'billing', label: 'Billing', icon: '💳', content: <BillingSettings /> }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Manage your account settings and preferences
          </p>
        </motion.div>

        <SaasTabs
          tabs={tabs}
          defaultTab="security"
          className="mb-8"
        />
      </div>
    </div>
  )
}

