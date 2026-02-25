/**
 * Billing Subscribe Page
 * Allows users to subscribe to SafeNode plans
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { createCheckoutSession } from '../../services/billingService'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { Shield } from '../../icons/Shield'
import {
  PRICING_PLANS,
  type BillingCycle,
  getCheckoutTarget,
  getPlanMonthlyPrice,
} from '../../config/pricingPlans'

export const SubscribePage: React.FC = () => {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (
    planId: string,
    checkoutTarget?: { provider: 'paddle' | 'stripe'; value: string } | null
  ) => {
    if (planId === 'free') {
      navigate('/auth?mode=signup')
      return
    }

    if (!checkoutTarget) {
      setError('Checkout is not configured for this plan yet. Please contact support.')
      return
    }

    setLoading(planId)
    setError(null)

    try {
      if (checkoutTarget.provider === 'paddle') {
        window.location.href = checkoutTarget.value
        return
      }

      const session = await createCheckoutSession(
        checkoutTarget.value,
        `${window.location.origin}/billing/success?plan=${planId}`,
        `${window.location.origin}/billing`
      )

      window.location.href = session.url
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout session')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Vault
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6">
            Upgrade to unlock advanced features and protect your digital life with SafeNode
          </p>

          <div className="inline-flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                billingCycle === 'annual'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Annual <span className="text-green-600">Save 17%</span>
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mb-8 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl"
          >
            <p className="text-error-600 dark:text-error-400 text-sm font-medium">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {PRICING_PLANS.map((plan, index) => {
            const checkoutTarget = getCheckoutTarget(plan, billingCycle)
            const isLoading = loading === plan.id

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <SaasCard
                  className={`h-full flex flex-col ${plan.highlight ? 'ring-2 ring-secondary-500 shadow-xl' : ''}`}
                >
                  {plan.highlight && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="bg-gradient-to-r from-secondary-500 to-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                      {plan.tagline}
                    </p>

                    <div className="mb-6">
                      <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                        {getPlanMonthlyPrice(plan, billingCycle)}
                      </span>
                      {plan.price !== 0 && <span className="text-slate-600 dark:text-slate-400">/mo</span>}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <svg
                            className="w-5 h-5 text-secondary-500 mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-slate-700 dark:text-slate-300 text-sm">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <SaasButton
                    variant={plan.highlight ? 'primary' : 'secondary'}
                    size="lg"
                    fullWidth
                    onClick={() => handleSubscribe(plan.id, checkoutTarget)}
                    disabled={loading !== null}
                    isLoading={isLoading}
                  >
                    {isLoading ? 'Loading...' : plan.cta}
                  </SaasButton>
                </SaasCard>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl mx-auto mt-12 text-center"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <Shield className="w-4 h-4 inline-block mr-1" />
            All plans include zero-knowledge encryption. Your data is protected.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
