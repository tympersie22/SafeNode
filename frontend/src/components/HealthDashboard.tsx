/**
 * Password Health Dashboard
 * Displays password strength analysis, breach status, and recommendations
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SaasCard } from '../ui/SaasCard'
import { SaasButton } from '../ui/SaasButton'
import { evaluatePasswordHealth, type PasswordHealthSummary } from '../health/passwordHealth'
import type { VaultEntry } from '../types/vault'
import { Shield, AlertTriangle } from 'lucide-react'

interface HealthDashboardProps {
  entries: VaultEntry[]
  healthSummary: PasswordHealthSummary | null
  onRescan?: () => void
  isScanning?: boolean
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({
  entries,
  healthSummary,
  onRescan,
  isScanning = false
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Extract weak and breached entries from issues
  const weakEntries = healthSummary?.issues
    .filter(issue => issue.type === 'weak')
    .map(issue => entries.find(e => e.id === issue.entryId))
    .filter(Boolean) as VaultEntry[] || []

  const breachedEntries = entries.filter(e => e.breachCount && e.breachCount > 0)

  // Count password frequency
  const passwordFrequency: Record<string, number> = {}
  entries.forEach(entry => {
    if (entry.password) {
      passwordFrequency[entry.password] = (passwordFrequency[entry.password] || 0) + 1
    }
  })

  if (!healthSummary) {
    return (
      <SaasCard>
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400">
            Add password entries to see health analysis
          </p>
        </div>
      </SaasCard>
    )
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStrengthLabel = (entry: VaultEntry) => {
    const pwd = entry.password || ''
    if (pwd.length >= 16 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd)) {
      return { label: 'Strong', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20' }
    }
    if (pwd.length >= 12 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd) && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)) {
      return { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/20' }
    }
    return { label: 'Weak', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/20' }
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <SaasCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Password Health
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Overall security score for your vault
            </p>
          </div>
          {onRescan && (
            <SaasButton
              variant="secondary"
              size="sm"
              onClick={onRescan}
                    loading={isScanning}
            >
              {isScanning ? 'Scanning...' : 'Rescan'}
            </SaasButton>
          )}
        </div>

        {/* Health Score Circle */}
        <div className="flex items-center justify-center mb-8">
          <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-200 dark:text-slate-700"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={getHealthScoreColor(healthSummary.score)}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: healthSummary.score / 100 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                strokeDasharray={`${2 * Math.PI * 56}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  className={`text-3xl font-bold ${getHealthScoreColor(healthSummary.score)}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                >
                  {healthSummary.score}
                </motion.div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  / 100
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {healthSummary.totalEntries}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Total Entries
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {healthSummary.weakCount}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Weak Passwords
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {healthSummary.reusedCount}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Reused
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {healthSummary.compromisedCount}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Breached
            </div>
          </div>
        </div>
      </SaasCard>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weak Passwords */}
        {healthSummary.weakCount > 0 && (
          <SaasCard>
            <div
              className="cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === 'weak' ? null : 'weak')}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Weak Passwords
                </h3>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {healthSummary.weakCount}
                </span>
              </div>
            </div>
            <AnimatePresence>
              {expandedSection === 'weak' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2"
                >
                  {weakEntries.slice(0, 5).map((entry) => {
                    const label = getStrengthLabel(entry)
                    return (
                      <div
                        key={entry.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {entry.name}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {entry.username}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${label.bg} ${label.color}`}>
                          {label.label}
                        </span>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </SaasCard>
        )}

        {/* Reused Passwords */}
        {healthSummary.reusedCount > 0 && (
          <SaasCard>
            <div
              className="cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === 'reused' ? null : 'reused')}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Reused Passwords
                </h3>
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {healthSummary.reusedCount}
                </span>
              </div>
            </div>
            <AnimatePresence>
              {expandedSection === 'reused' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2"
                >
                  {Object.entries(passwordFrequency)
                    .filter(([_, count]) => count > 1)
                    .slice(0, 5)
                    .map(([_, count], idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          Password reused {count} times
                        </div>
                      </div>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </SaasCard>
        )}

        {/* Breached Passwords */}
        {healthSummary.compromisedCount > 0 && (
          <SaasCard className="col-span-1 md:col-span-2">
            <div
              className="cursor-pointer"
              onClick={() => setExpandedSection(expandedSection === 'breached' ? null : 'breached')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Breached Passwords
                  </h3>
                </div>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {healthSummary.compromisedCount}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                These passwords have been found in data breaches. Change them immediately.
              </p>
            </div>
            <AnimatePresence>
              {expandedSection === 'breached' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2"
                >
                  {breachedEntries.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {entry.name}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {entry.username}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600 dark:text-red-400">
                          Breached {entry.breachCount || 0} times
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-500">
                          {entry.lastBreachCheck
                            ? new Date(entry.lastBreachCheck).toLocaleDateString()
                            : 'Not checked'}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </SaasCard>
        )}
      </div>
    </div>
  )
}

