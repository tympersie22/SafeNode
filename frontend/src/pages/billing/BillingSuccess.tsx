/**
 * Billing Success Page
 * Shown after successful Stripe checkout
 */

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, ArrowRight, Shield } from 'lucide-react'
import { getCurrentUser } from '../../services/authService'

const PLAN_NAMES: Record<string, string> = {
  individual: 'Personal',
  family: 'Family',
  teams: 'Teams',
  business: 'Business'
}

export const BillingSuccessPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan')
  const planName = planId ? PLAN_NAMES[planId] || planId : 'your plan'
  const [syncing, setSyncing] = useState(true)

  // Refresh user data to sync subscription status
  useEffect(() => {
    const syncSubscription = async () => {
      try {
        await getCurrentUser()
      } catch (err) {
        // Non-critical — subscription will sync on next login
        console.error('Failed to sync subscription:', err)
      } finally {
        setSyncing(false)
      }
    }
    syncSubscription()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
        >
          <CheckCircle className="w-12 h-12 text-green-600" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-gray-900 mb-3"
        >
          Subscription Active!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-gray-600 mb-2"
        >
          Welcome to SafeNode <span className="font-semibold text-gray-900">{planName}</span>.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-gray-500 mb-8"
        >
          {syncing
            ? 'Syncing your subscription...'
            : 'Your account has been upgraded. All premium features are now available.'
          }
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-950 hover:bg-gray-800 text-white font-semibold rounded-xl transition min-h-[44px]"
          >
            Go to Vault
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/settings/billing')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl transition min-h-[44px]"
          >
            <Shield className="w-4 h-4" />
            Manage Subscription
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-8 text-xs text-gray-400"
        >
          A confirmation email has been sent to your inbox.
        </motion.p>
      </motion.div>
    </div>
  )
}

export default BillingSuccessPage
