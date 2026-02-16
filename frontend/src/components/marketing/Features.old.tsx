/**
 * Features Section
 * Redesigned with visual hierarchy and emotional benefits
 */

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const Shield = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const Lock = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)

const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const Cloud = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
)

const Key = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

interface Feature {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  whyItMatters: string
  emphasis: 'primary' | 'secondary' | 'tertiary'
}

const features: Feature[] = [
  {
    icon: Shield,
    title: 'Zero-Knowledge Architecture',
    description: 'We literally cannot access your passwords. Your master password never leaves your device. If you lose your master password, even we cannot recover it. That\'s how secure this is.',
    whyItMatters: 'You hold the only key. We literally can\'t access your vault.',
    emphasis: 'primary'
  },
  {
    icon: Lock,
    title: 'Military-Grade Encryption',
    description: 'Your passwords are encrypted with AES-256-GCM—the same standard used by banks and governments worldwide. Encryption happens on your device before anything leaves your computer.',
    whyItMatters: 'Your passwords are encrypted on your device, before transmission.',
    emphasis: 'primary'
  },
  {
    icon: Eye,
    title: 'Breach Monitoring & Alerts',
    description: 'We continuously monitor 10+ breach databases. If your credentials appear anywhere online, you get instant alerts so you can act before criminals do.',
    whyItMatters: 'Stay ahead of threats before they become problems.',
    emphasis: 'secondary'
  },
  {
    icon: Cloud,
    title: 'Universal Sync',
    description: 'Your vault syncs seamlessly across all your devices—desktop, mobile, and web. Your passwords are always available, always secure.',
    whyItMatters: 'Access your vault anywhere, anytime, securely.',
    emphasis: 'tertiary'
  },
  {
    icon: Key,
    title: 'Password Generator',
    description: 'Generate strong, unique passwords with customizable length and character sets. Never reuse passwords again with our smart password generator.',
    whyItMatters: 'Create unbreakable passwords in seconds.',
    emphasis: 'tertiary'
  },
  {
    icon: Users,
    title: 'Secure Sharing',
    description: 'Share passwords and credentials with team members using end-to-end encryption. Control access levels and revoke permissions instantly.',
    whyItMatters: 'Share safely with your team, without compromise.',
    emphasis: 'tertiary'
  }
]

export const Features: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()

  const primaryFeatures = features.filter(f => f.emphasis === 'primary')
  const secondaryFeatures = features.filter(f => f.emphasis === 'secondary')
  const tertiaryFeatures = features.filter(f => f.emphasis === 'tertiary')

  return (
    <section id="features" className="py-20 lg:py-32 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Everything you need to
            <br />
            <span className="bg-gradient-to-r from-safenode-primary to-safenode-secondary bg-clip-text text-transparent">
              secure your digital life
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Built with security-first principles and modern design
          </p>
        </motion.div>

        {/* Primary Features - Larger, emphasized */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {primaryFeatures.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                className="group relative p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-safenode-primary/30 dark:border-safenode-primary/30 hover:border-safenode-primary/50 dark:hover:border-safenode-primary/50 transition-all duration-300 shadow-elevation-2 hover:shadow-elevation-3"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={prefersReducedMotion ? {} : { y: -4 }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-safenode-primary to-safenode-secondary rounded-xl mb-6 shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                  {feature.description}
                </p>
                <p className="text-sm font-semibold text-safenode-primary dark:text-safenode-secondary">
                  {feature.whyItMatters}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Secondary Feature */}
        {secondaryFeatures.map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={index}
              className="mb-12 p-8 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-elevation-1"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-safenode-primary to-safenode-secondary rounded-xl shadow-md flex-shrink-0">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                    {feature.description}
                  </p>
                  <p className="text-sm font-semibold text-safenode-primary dark:text-safenode-secondary">
                    {feature.whyItMatters}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}

        {/* Tertiary Features - Smaller grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tertiaryFeatures.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                className="group p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-safenode-primary/30 dark:hover:border-safenode-primary/30 transition-all duration-300 shadow-elevation-1 hover:shadow-elevation-2"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={prefersReducedMotion ? {} : { y: -2 }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-safenode-primary/20 to-safenode-secondary/20 dark:from-safenode-primary/30 dark:to-safenode-secondary/30 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-safenode-primary dark:text-safenode-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Features
