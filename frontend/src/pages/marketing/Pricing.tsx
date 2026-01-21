/**
 * Pricing Page
 * Professional pricing with enterprise positioning
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
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Perfect for trying SafeNode',
    features: [
      'Unlimited passwords',
      '1 device access',
      'AES-256-GCM encryption',
      'Password generator',
      'Basic breach monitor',
      'Community support'
    ],
    cta: 'Get Started Free',
    popular: false,
    deEmphasized: true
  },
  {
    id: 'individual',
    name: 'Individual',
    price: '$2.99',
    period: 'month',
    monthlyPrice: 2.49,
    annualPrice: 29.88,
    annualSavings: 15,
    description: 'For personal users & power users with multiple devices.',
    features: [
      'Everything in Free',
      '5 devices',
      'Real-time sync',
      'Real-time breach alerts',
      'Secure sharing (5 people)',
      'Advanced 2FA + Biometric',
      'Priority email support'
    ],
    cta: 'Start Subscription',
    popular: true,
    guarantee: true
  },
  {
    id: 'family',
    name: 'Family',
    price: '$4.99',
    period: 'month',
    monthlyPrice: 4.99,
    annualPrice: 49.88,
    annualSavings: 17,
    description: 'For families and small teams sharing credentials.',
    features: [
      'Everything in Individual',
      'Up to 10 devices',
      '20 shared vaults',
      '5GB secure file storage',
      'Family sharing controls',
      'Advanced security',
      'Priority support'
    ],
    cta: 'Start Subscription',
    popular: false,
    guarantee: true
  },
  {
    id: 'teams',
    name: 'Teams',
    price: '$9.99',
    period: 'month',
    monthlyPrice: 9.99,
    annualPrice: 99.88,
    annualSavings: 17,
    description: 'For growing teams and small businesses.',
    features: [
      'Everything in Family',
      'Up to 50 devices',
      '100 shared vaults',
      'Team vault management',
      'Role-based access (RBAC)',
      'Audit logs',
      'SSO integration ready',
      'Priority support'
    ],
    cta: 'Start Subscription',
    popular: false,
    guarantee: true
  },
  {
    id: 'business',
    name: 'Business',
    price: 'Custom',
    period: 'pricing',
    monthlyPrice: null,
    annualPrice: null,
    description: 'For enterprises requiring custom solutions and SLAs.',
    features: [
      'Everything in Teams',
      'Unlimited devices/vaults',
      'Advanced admin dashboard',
      'Dedicated account manager',
      'Custom onboarding',
      '99.9% uptime SLA',
      '24/7 dedicated support',
      'Custom integrations',
      'Multi-tenant options'
    ],
    cta: 'Contact Sales',
    popular: false,
    enterprise: true
  }
]

export const PricingPage: React.FC = () => {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  const handleGetStarted = async (planId: string) => {
    if (planId === 'free') {
      navigate('/auth?mode=signup')
        return
      }
      
    if (planId === 'business') {
      // Open contact form or email
      window.location.href = 'mailto:sales@safenode.com?subject=Enterprise Inquiry'
        return
      }

    try {
      setLoading(planId)
      const user = await getCurrentUser()
      
      if (!user) {
        navigate('/auth?mode=signup&plan=' + planId)
        return
      }

      const plan = PRICING_PLANS.find(p => p.id === planId)
      if (!plan) return

      const priceId = billingCycle === 'annual' 
        ? `${planId}_annual` 
        : `${planId}_monthly`

      const successUrl = `${window.location.origin}/?success=true&plan=${planId}`
      const cancelUrl = `${window.location.origin}/pricing`

      const session = await createCheckoutSession(priceId, successUrl, cancelUrl)
      
      if (session?.url) {
        window.location.href = session.url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      navigate('/auth?mode=signup&plan=' + planId)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <Logo variant="nav" />
              <span className="font-bold text-lg text-slate-900 dark:text-white">SafeNode</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm text-slate-600 dark:text-slate-400 hover:text-safenode-primary transition-colors">
                Home
              </Link>
              <Link to="/security" className="text-sm text-slate-600 dark:text-slate-400 hover:text-safenode-primary transition-colors">
                Security
              </Link>
              <Link to="/downloads" className="text-sm text-slate-600 dark:text-slate-400 hover:text-safenode-primary transition-colors">
                Download
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
            className="text-5xl md:text-6xl font-bold mb-6"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
            Professional Security. Transparent Pricing.
            </motion.h1>
            <motion.p
            className="text-xl text-white/80 max-w-3xl mx-auto mb-8"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
            Choose the plan that fits your security needs. All plans include military-grade encryption and zero-knowledge architecture.
            </motion.p>

          {/* Billing Toggle */}
          <motion.div
            className="inline-flex items-center gap-2 p-1 bg-white/10 rounded-lg backdrop-blur-sm"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingCycle === 'annual'
                  ? 'bg-white text-slate-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Annual Billing - Save 30%
            </button>
          </motion.div>
        </div>
      </section>

      {/* Meta Information */}
      <section className="py-8 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-700 dark:text-slate-300">
            All plans include 256-bit AES-GCM encryption, zero-knowledge architecture, and regular security audits. No data collection. No ads. Your privacy is guaranteed.
          </p>
          </div>
        </section>

        {/* Pricing Cards */}
      <section className="py-20 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {PRICING_PLANS.map((plan, index) => {
              const displayPrice = billingCycle === 'annual' && plan.annualPrice !== null
                ? `$${plan.annualPrice.toFixed(2)}`
                : plan.price
              
              const displayPeriod = billingCycle === 'annual' && plan.annualPrice !== null
                ? 'per year'
                : plan.period === 'forever' ? 'forever free' : `per month (billed ${billingCycle === 'annual' ? 'annually' : 'monthly'})`

              const annualNote = billingCycle === 'annual' && plan.annualSavings
                ? `OR $${plan.annualPrice?.toFixed(2)}/year (save ${plan.annualSavings}%)`
                : billingCycle === 'monthly' && plan.annualSavings
                ? `OR $${plan.annualPrice?.toFixed(2)}/year (save ${plan.annualSavings}%)`
                : null

              return (
                <motion.div
                  key={plan.id}
                  className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                    plan.popular
                      ? 'border-safenode-primary bg-gradient-to-br from-white to-safenode-primary/5 dark:from-slate-800 dark:to-safenode-primary/10 shadow-elevation-3 scale-105'
                      : plan.deEmphasized
                      ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shadow-elevation-1'
                      : plan.enterprise
                      ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-elevation-2'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-elevation-1 hover:shadow-elevation-2'
                  }`}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={prefersReducedMotion ? {} : plan.deEmphasized ? {} : { y: -4 }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-6 px-3 py-1 bg-gradient-to-r from-safenode-primary to-safenode-secondary text-white text-xs font-bold rounded-full">
                      ⭐ MOST POPULAR
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {plan.description}
                    </p>
                    <div className="mb-2">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">
                        {displayPrice}
                      </span>
                      {plan.period !== 'pricing' && (
                        <span className="text-slate-600 dark:text-slate-400 ml-2">
                          {displayPeriod}
                        </span>
                      )}
                    </div>
                    {annualNote && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {annualNote}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleGetStarted(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-3 rounded-lg font-semibold mb-4 transition-all duration-200 ${
                      plan.popular
                        ? 'bg-safenode-primary hover:bg-safenode-primary/90 text-white shadow-lg hover:shadow-xl'
                        : plan.enterprise
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                        : plan.deEmphasized
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                    }`}
                  >
                    {loading === plan.id ? 'Processing...' : plan.cta}
                  </button>

                  {plan.guarantee && (
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-4">
                      30-day money-back guarantee
                    </p>
                  )}

                  {plan.enterprise && (
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-4">
                      Volume licensing available
                    </p>
                  )}

                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-safenode-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Money-Back Guarantee */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border-2 border-safenode-primary/20 shadow-elevation-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 text-center">
              Money-Back Guarantee
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-center leading-relaxed">
              Unsatisfied with your subscription? 30 days to cancel for full refund. No questions asked.
              <br />
              <br />
              We're confident SafeNode is the best security solution on the market. If it's not for you, we'll refund 100%.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Detailed Feature Comparison
            </h2>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <th className="text-left p-4 font-semibold text-slate-900 dark:text-white"></th>
                  {PRICING_PLANS.map(plan => (
                    <th key={plan.id} className={`text-center p-4 font-semibold text-slate-900 dark:text-white ${
                      plan.popular ? 'bg-safenode-primary/10' : ''
                    }`}>
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Devices</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">1</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">5</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">10</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">50</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Unlimited</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Shared Vaults</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">5 people</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">20</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">100</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Unlimited</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Storage</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">5GB</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">50GB</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Unlimited</td>
                </tr>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">SECURITY</td>
                  <td colSpan={5}></td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Encryption</td>
                  {PRICING_PLANS.map(plan => (
                    <td key={plan.id} className="p-4 text-center">
                      <span className="text-safenode-primary text-xl">✓</span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Zero-Knowledge</td>
                  {PRICING_PLANS.map(plan => (
                    <td key={plan.id} className="p-4 text-center">
                      <span className="text-safenode-primary text-xl">✓</span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">2FA Options</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Basic</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Advanced</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Advanced</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Advanced</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Advanced</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Biometric</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  {PRICING_PLANS.slice(1).map(plan => (
                    <td key={plan.id} className="p-4 text-center">
                      <span className="text-safenode-primary text-xl">✓</span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">TEAM FEATURES</td>
                  <td colSpan={5}></td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">RBAC</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Audit Logs</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Admin Dashboard</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                </tr>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">SUPPORT</td>
                  <td colSpan={5}></td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Email Support</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Community</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Priority</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Priority</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">Priority</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">24/7</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Phone Support</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Account Manager</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">SLA</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">99.9%</td>
                </tr>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">INTEGRATIONS</td>
                  <td colSpan={5}></td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">SSO Ready</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-slate-900 dark:text-white">Custom APIs</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center">
                    <span className="text-safenode-primary text-xl">✓</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </div>
        </section>

        {/* FAQ Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
            className="text-center mb-12"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Frequently Asked Questions
              </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Everything about SafeNode pricing and plans
              </p>
            </motion.div>

          <div className="space-y-6">
            {[
              {
                q: 'How does billing work?',
                a: 'We bill monthly or annually. Annual plans save 15-17% compared to monthly. You can change your plan or cancel anytime. Changes take effect immediately.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and ACH transfers for enterprise customers. Invoicing available for Teams+ plans.'
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel anytime from your account settings. Your subscription continues until the end of your current billing period.'
              },
              {
                q: 'Do you offer refunds?',
                a: 'Yes. All subscription plans include a 30-day money-back guarantee. No questions asked. Contact support to process a refund.'
              },
              {
                q: 'Can I upgrade or downgrade?',
                a: 'Absolutely. Change your plan anytime. Pro-rated credits or charges apply immediately based on your new plan.'
              },
              {
                q: 'What if I need a custom plan?',
                a: 'Enterprise customers can contact our sales team for volume pricing, custom features, dedicated support, and SLA agreements.'
              },
              {
                q: 'Do you offer discounts for nonprofits or education?',
                a: 'Yes. We offer 50% off Teams plan for nonprofits and educational institutions. Contact us with proof of status.'
              },
              {
                q: 'Is there a free tier forever?',
                a: 'Yes. Our Free plan ($0) is always available for personal use. No time limit, no credit card required to stay on free.'
              },
              {
                q: 'What\'s included in the money-back guarantee?',
                a: 'You have 30 days from purchase to request a full refund for any reason. No questions, no penalties. Contact support.'
              },
              {
                q: 'How do you handle the zero-knowledge promise?',
                a: 'We literally cannot access your passwords. If you lose your master password, even we can\'t recover it. This is by design—your data is truly yours alone.'
              }
            ].map((faq, index) => (
                <motion.div
                  key={index}
                className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-elevation-1"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {faq.q}
                  </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      <Footer />
    </div>
  )
}

export default PricingPage
