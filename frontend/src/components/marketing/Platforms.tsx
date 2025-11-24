/**
 * Platforms Section
 * Show available platforms and how it works
 */

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Create Your Vault',
    description: 'Sign up in seconds with your email. Create a master password that only you know—this is the only key to your encrypted vault.'
  },
  {
    number: '02',
    title: 'Add Your Passwords',
    description: 'Import existing passwords or add them manually. SafeNode automatically encrypts everything before it\'s stored in your secure vault.'
  },
  {
    number: '03',
    title: 'Access Anywhere',
    description: 'Unlock your vault on any device with your master password. Your data syncs securely across all platforms, keeping you protected everywhere.'
  }
]

const platforms = [
  { name: 'Web App', icon: '🌐', available: true },
  { name: 'Desktop', icon: '💻', available: true },
  { name: 'Mobile', icon: '📱', available: 'Coming Soon' },
  { name: 'Browser Extension', icon: '🔌', available: 'Coming Soon' }
]

export const Platforms: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* How It Works */}
        <div className="mb-20">
          <motion.div
            className="text-center mb-16"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">
              How SafeNode Works
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Three simple steps to secure your digital life
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
                whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                {/* Step Number */}
                <div className="text-6xl font-black text-secondary-200 dark:text-secondary-900/50 mb-4">
                  {step.number}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.description}
                </p>

                {/* Connector line (not on last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-secondary-300 to-transparent dark:from-secondary-700" style={{ width: 'calc(100% - 2rem)' }} />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Available Platforms */}
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
          whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
              Available on All Your Devices
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Access your secure vault anywhere, anytime
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {platforms.map((platform, index) => (
              <motion.div
                key={index}
                className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center hover:border-secondary-300 dark:hover:border-secondary-600 transition-all duration-300"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
                whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={prefersReducedMotion ? {} : { y: -4 }}
              >
                <div className="text-4xl mb-3">{platform.icon}</div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">
                  {platform.name}
                </div>
                {platform.available === true ? (
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Available Now
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {platform.available}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Platforms
