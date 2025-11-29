/**
 * Pricing Page
 * Marketing page showcasing SafeNode pricing tiers
 */

import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'
import { createCheckoutSession } from '../../services/billingService'
import { getCurrentUser } from '../../services/authService'

const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started with password management',
    features: [
      'Unlimited password storage',
      'Access from 1 device',
      'AES-256-GCM encryption',
      'Secure password generator',
      'Basic breach monitoring',
      'Community support'
    ],
    cta: 'Get Started Free',
    popular: false,
    priceId: null
  },
  {
    id: 'individual',
    name: 'Individual',
    price: '$2.99',
    period: 'month',
    description: 'Best for personal use and power users',
    features: [
      'Everything in Free plan',
      'Unlimited device access',
      'Automatic cloud sync',
      'Real-time breach alerts',
      'Secure sharing (up to 5 people)',
      'Priority email support',
      'Advanced 2FA options',
      'Biometric authentication'
    ],
    cta: 'Start Free Trial',
    popular: true,
    trial: '14-day free trial',
    priceId: import.meta.env.VITE_STRIPE_PRICE_INDIVIDUAL || 'price_individual_monthly'
  },
  {
    id: 'family',
    name: 'Family',
    price: '$4.99',
    period: 'month',
    description: 'Ideal for families and small teams',
    features: [
      'Everything in Individual',
      'Up to 10 devices',
      '20 shared vaults',
      '5GB secure file storage',
      'Family sharing features',
      'Advanced security controls',
      'Priority support included'
    ],
    cta: 'Start Free Trial',
    popular: false,
    trial: '7-days free trial',
    priceId: import.meta.env.VITE_STRIPE_PRICE_FAMILY || 'price_family_monthly'
  },
  {
    id: 'teams',
    name: 'Teams',
    price: '$9.99',
    period: 'month',
    description: 'Built for growing businesses and teams',
    features: [
      'Everything in Family',
      'Up to 50 devices',
      '100 shared vaults',
      'Team vault management',
      'Role-based access control',
      'Comprehensive audit logs',
      'Priority support',
      'SSO integration ready'
    ],
    cta: 'Start Free Trial',
    popular: false,
    trial: '14-day free trial',
    priceId: import.meta.env.VITE_STRIPE_PRICE_TEAMS || 'price_teams_monthly'
  },
  {
    id: 'business',
    name: 'Business',
    price: 'Custom',
    period: 'pricing',
    description: 'Enterprise-grade security and support',
    features: [
      'Everything in Teams',
      'Unlimited devices & vaults',
      'Advanced admin dashboard',
      'Dedicated account manager',
      'Custom onboarding & training',
      '99.9% uptime SLA',
      '24/7 priority support',
      'Custom integrations available'
    ],
    cta: 'Contact Sales',
    popular: false,
    custom: true,
    priceId: null
  }
]

const FAQ = [
  {
    question: 'How does zero-knowledge encryption work?',
    answer: 'Zero-knowledge means SafeNode cannot access your passwords. Your master password encrypts your data locally, and only you can decrypt it. We never see your master password or unencrypted data.'
  },
  {
    question: 'What happens if I forget my master password?',
    answer: 'Unfortunately, we cannot recover your master password due to our zero-knowledge architecture. However, you can set up account recovery options during setup, including biometric authentication and recovery codes.'
  },
  {
    question: 'Can I change my plan later?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any differences.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! All paid plans come with a 14-day free trial. No credit card required for the trial period.'
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time. Your account will remain active until the end of your current billing period.'
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes. We offer a 30-day money-back guarantee for all paid plans. Contact our support team to request a refund.'
  }
]

export const PricingPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGetStarted = async (plan: typeof PRICING_PLANS[0]) => {
    setError(null)
    setLoading(plan.id)
    
    try {
      // Handle free plan
      if (plan.id === 'free') {
        window.location.href = '/#auth?mode=signup'
        return
      }
      
      // Handle business plan
      if (plan.id === 'business') {
        window.location.href = 'mailto:sales@safenode.app?subject=Business Plan Inquiry'
        return
      }

      // For paid plans, check authentication first
      let isAuthenticated = false
      let user = null
      try {
        user = await getCurrentUser()
        isAuthenticated = true
      } catch (authError: any) {
        // User is not authenticated, redirect to signup
        isAuthenticated = false
      }

      if (!isAuthenticated) {
        // Redirect to signup with plan info
        const signupUrl = `/#auth?mode=signup&plan=${plan.id}`
        window.location.href = signupUrl
        return
      }

      // User is authenticated, create Stripe checkout
      if (!plan.priceId) {
        const errorMsg = 'Price ID not configured for this plan. Please contact support.'
        setError(errorMsg)
        setLoading(null)
        return
      }
      
      const successUrl = `${window.location.origin}/?success=true&plan=${plan.id}`
      const cancelUrl = `${window.location.origin}/pricing`
      
      const session = await createCheckoutSession(
        plan.priceId,
        successUrl,
        cancelUrl
      )

      if (!session || !session.url || session.url === '') {
        const errorMsg = 'Failed to create checkout session. The server did not return a valid checkout URL.'
        setError(errorMsg)
        setLoading(null)
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = session.url
    } catch (err: any) {
      console.error('Checkout error:', err)
      
      // Handle specific error cases
      if (err.message?.includes('Not authenticated') || err.message?.includes('401')) {
        // Redirect to signup if authentication failed
        window.location.href = `/#auth?mode=signup&plan=${plan.id}`
        return
      }
      
      const errorMessage = err.message || 'Failed to start checkout. Please try again.'
      setError(errorMessage)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav 
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Logo variant="nav" />
              <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">
                  SafeNode
                </h1>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium">
                Back to Home
              </Link>
              <motion.button
                onClick={() => navigate('/auth?mode=signup')}
                className="px-5 py-2.5 bg-gradient-to-r from-secondary-600 to-secondary-500 hover:from-secondary-700 hover:to-secondary-600 text-white text-sm font-semibold rounded-lg transition-all duration-200"
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                Get Started
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Header */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Simple, Transparent Pricing
            </motion.h1>
            <motion.p
              className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-4"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Choose the plan that's right for you. All plans include our core security features.
            </motion.p>
            <motion.p
              className="text-sm text-slate-500 dark:text-slate-500"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              All paid plans include a 14-day free trial • No credit card required
            </motion.p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {PRICING_PLANS.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                    plan.popular
                      ? 'border-secondary-500 dark:border-secondary-400 bg-gradient-to-br from-secondary-50 to-white dark:from-secondary-950 dark:to-slate-900 shadow-xl md:scale-105 z-10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={prefersReducedMotion ? {} : { y: -4 }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                      <span className="bg-gradient-to-r from-secondary-600 to-secondary-500 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6 flex-shrink-0">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mb-4 min-h-[2.5rem] leading-relaxed">
                      {plan.description}
                    </p>
                    <div className="mb-2">
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                        {plan.price}
                      </span>
                      {plan.period !== 'pricing' && (
                        <span className="text-slate-600 dark:text-slate-400 text-sm">/{plan.period}</span>
                      )}
                    </div>
                    {plan.trial && (
                      <p className="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
                        {plan.trial}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <svg
                          className="w-4 h-4 text-secondary-500 dark:text-secondary-400 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleGetStarted(plan)
                    }}
                    disabled={loading === plan.id}
                    type="button"
                    className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.popular
                        ? 'bg-gradient-to-r from-secondary-600 to-secondary-500 hover:from-secondary-700 hover:to-secondary-600 text-white shadow-safenode-secondary'
                        : plan.id === 'free'
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                        : 'bg-secondary-100 dark:bg-secondary-900 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-800'
                    }`}
                    whileHover={prefersReducedMotion || loading === plan.id ? {} : { scale: 1.02 }}
                    whileTap={prefersReducedMotion || loading === plan.id ? {} : { scale: 0.98 }}
                  >
                    {loading === plan.id ? 'Processing...' : plan.cta}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white text-center mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-center text-slate-600 dark:text-slate-400 mb-12">
                Everything you need to know about SafeNode pricing and plans
              </p>
            </motion.div>
            <div className="space-y-4">
              {FAQ.map((item, index) => (
                <motion.div
                  key={index}
                  className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:border-secondary-300 dark:hover:border-secondary-700 transition-colors duration-200"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3 leading-snug">
                    {item.question}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.answer}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-secondary-600 via-secondary-500 to-secondary-600 dark:from-secondary-700 dark:via-secondary-600 dark:to-secondary-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h2
              className="text-4xl md:text-5xl font-extrabold text-white mb-6"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Ready to secure your digital life?
            </motion.h2>
            <motion.p
              className="text-xl text-secondary-100 dark:text-secondary-200 mb-8"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Start your free account today—no credit card required.
            </motion.p>
            <motion.button
              onClick={() => window.location.href = '/#auth'}
              className="px-8 py-4 bg-white hover:bg-slate-50 text-secondary-600 dark:text-secondary-700 text-lg font-semibold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl"
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            >
              Get Started Free
            </motion.button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default PricingPage

