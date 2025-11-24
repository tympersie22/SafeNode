/**
 * Billing Subscribe Page
 * Allows users to subscribe to SafeNode plans
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { createCheckoutSession } from '../../services/billingService'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { Shield } from '../../icons/Shield'

const PLANS = [
  {
    id: 'individual',
    name: 'Individual',
    price: '$0.99',
    period: 'month',
    description: 'Perfect for personal use',
    features: [
      '3 devices',
      '5 vaults',
      '1GB storage',
      'Priority support',
      'Breach monitoring',
      'Password generator'
    ],
    priceId: process.env.VITE_STRIPE_PRICE_INDIVIDUAL || 'price_individual_monthly',
    popular: false
  },
  {
    id: 'family',
    name: 'Family',
    price: '$1.99',
    period: 'month',
    description: 'For families and small teams',
    features: [
      '10 devices',
      '20 vaults',
      '5GB storage',
      'Priority support',
      'Breach monitoring',
      'Password generator',
      'Secure sharing'
    ],
    priceId: process.env.VITE_STRIPE_PRICE_FAMILY || 'price_family_monthly',
    popular: true
  },
  {
    id: 'teams',
    name: 'Teams',
    price: '$11.99',
    period: 'month',
    description: 'For growing teams',
    features: [
      '50 devices',
      '100 vaults',
      '10GB storage',
      'Priority support',
      'Breach monitoring',
      'Password generator',
      'Secure sharing',
      'Team vaults',
      'Role-based access',
      'Audit logs'
    ],
    priceId: process.env.VITE_STRIPE_PRICE_TEAMS || 'price_teams_monthly',
    popular: false
  },
  {
    id: 'business',
    name: 'Business',
    price: '$5.99',
    period: 'month',
    description: 'For businesses',
    features: [
      '200 devices',
      '500 vaults',
      '50GB storage',
      '24/7 support',
      'Breach monitoring',
      'Password generator',
      'Secure sharing',
      'Team vaults',
      'Role-based access',
      'Audit logs',
      'SSO integration',
      'API access'
    ],
    priceId: process.env.VITE_STRIPE_PRICE_BUSINESS || 'price_business_monthly',
    popular: false
  }
]

export const SubscribePage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (planId: string, priceId: string) => {
    setLoading(planId)
    setError(null)

    try {
      const session = await createCheckoutSession(
        priceId,
        `${window.location.origin}/billing/success?plan=${planId}`,
        `${window.location.origin}/billing`
      )

      // Redirect to Stripe Checkout
      window.location.href = session.url
    } catch (err: any) {
      setError(err.message || 'Failed to create checkout session')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Upgrade to unlock advanced features and protect your digital life with SafeNode
          </p>
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

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <SaasCard
                className={`h-full flex flex-col ${plan.popular ? 'ring-2 ring-secondary-500 shadow-xl' : ''}`}
              >
                {plan.popular && (
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
                    {plan.description}
                  </p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                      {plan.price}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">/{plan.period}</span>
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
                  variant={plan.popular ? 'primary' : 'secondary'}
                  size="lg"
                  fullWidth
                  onClick={() => handleSubscribe(plan.id, plan.priceId)}
                  disabled={loading !== null}
                  isLoading={loading === plan.id}
                >
                  {loading === plan.id ? 'Loading...' : 'Subscribe'}
                </SaasButton>
              </SaasCard>
            </motion.div>
          ))}
        </div>

        {/* Security Note */}
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

