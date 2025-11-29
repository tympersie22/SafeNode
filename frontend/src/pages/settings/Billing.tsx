/**
 * Billing Settings Page
 * Manage subscription and billing
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { createPortalSession, getSubscriptionLimits, SubscriptionLimits } from '../../services/billingService'
import { getCurrentUser } from '../../services/authService'
import { Shield } from 'lucide-react'

export const BillingSettings: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const userData = await getCurrentUser()
      setUser(userData)

      const subscriptionLimits = await getSubscriptionLimits() as SubscriptionLimits
      setLimits(subscriptionLimits)
    } catch (err: any) {
      setError(err.message || 'Failed to load billing information')
    }
  }

  const handleManageBilling = async () => {
    setLoading(true)
    setError(null)

    try {
      const session = await createPortalSession(`${window.location.origin}/settings/billing`)
      window.location.href = session.url
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal')
      setLoading(false)
    }
  }

  const getTierDisplayName = (tier: string) => {
    const tierMap: Record<string, string> = {
      free: 'Free',
      pro: 'Pro',
      individual: 'Individual',
      family: 'Family',
      teams: 'Teams',
      business: 'Business',
      enterprise: 'Enterprise'
    }
    return tierMap[tier] || tier
  }

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Billing & Subscription
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your subscription and billing preferences
        </p>
      </div>

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

      {/* Current Plan */}
      {user && (
        <SaasCard>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Current Plan
              </h3>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {getTierDisplayName(user.subscriptionTier)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                Status: <span className="font-medium">{user.subscriptionStatus}</span>
              </p>
            </div>
            <div>
              {user.subscriptionStatus === 'active' && user.subscriptionTier !== 'free' ? (
                <SaasButton variant="primary" onClick={handleManageBilling} isLoading={loading}>
                  Manage Subscription
                </SaasButton>
              ) : (
                <SaasButton
                  variant="primary"
                  onClick={() => navigate('/billing')}
                >
                  Upgrade Plan
                </SaasButton>
              )}
            </div>
          </div>
        </SaasCard>
      )}

      {/* Subscription Limits */}
      {limits && (
        <SaasCard>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Usage Limits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Devices</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {limits.devices.current} / {formatLimit(limits.devices.limit)}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Vaults</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {limits.vaults.current} / {formatLimit(limits.vaults.limit)}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Team Members</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {limits.teamMembers.current} / {formatLimit(limits.teamMembers.limit)}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Storage</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {limits.storage.current} MB / {formatLimit(limits.storage.limit)} MB
              </p>
            </div>
          </div>
        </SaasCard>
      )}
    </div>
  )
}

