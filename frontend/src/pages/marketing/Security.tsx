/**
 * Security Page
 * Marketing page showcasing SafeNode security features
 */

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'
import { Shield, Lock, Eye, Key } from 'lucide-react'

const SECURITY_FEATURES = [
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'Every password is encrypted on your device before transmission. Only you hold the decryption key. We use AES-256-GCM, the same encryption standard trusted by banks and governments worldwide.'
  },
  {
    icon: Shield,
    title: 'Zero-Knowledge Architecture',
    description: 'SafeNode cannot access, read, or recover your passwords. If you lose your master password, even we can\'t help you—that\'s how secure it is. Your master password never leaves your device.'
  },
  {
    icon: Key,
    title: 'Argon2id Key Derivation',
    description: 'Your master password is strengthened using Argon2id, a memory-hard password hashing algorithm. This makes brute-force attacks computationally infeasible, even with powerful hardware.'
  },
  {
    icon: Eye,
    title: 'Open Source Audits',
    description: 'Our encryption methods are open source and regularly audited by security experts. Transparency builds trust. You can verify our security practices yourself.'
  }
]

const SECURITY_GUARANTEES = [
  {
    title: 'AES-256-GCM Encryption',
    description: 'Military-grade encryption ensures your data remains unreadable even if intercepted. Each vault entry is encrypted individually with a unique initialization vector.'
  },
  {
    title: 'Secure Key Storage',
    description: 'Encryption keys are derived locally using Argon2id. Keys never leave your device and are never transmitted to our servers in any form.'
  },
  {
    title: 'Two-Factor Authentication',
    description: 'Add an extra layer of security with TOTP-based 2FA. Support for authenticator apps and backup codes ensures you can always access your account.'
  },
  {
    title: 'Biometric Protection',
    description: 'Use Face ID, Touch ID, or Windows Hello for convenient yet secure vault access. Biometric data never leaves your device.'
  },
  {
    title: 'Regular Security Audits',
    description: 'We conduct regular security audits and penetration testing. Our security practices are transparent and continuously improved.'
  },
  {
    title: 'Breach Monitoring',
    description: 'We continuously monitor data breach databases and alert you immediately if your credentials appear in any breach.'
  }
]

export const SecurityPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const navigate = useNavigate()

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
                onClick={() => window.location.href = '/#auth'}
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
              Security You Can Trust
            </motion.h1>
            <motion.p
              className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-4"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Built with security-first principles. Your data is protected by military-grade encryption and zero-knowledge architecture.
            </motion.p>
          </div>
        </section>

        {/* Core Security Features */}
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2
              className="text-4xl font-extrabold text-slate-900 dark:text-white text-center mb-16"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Core Security Principles
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {SECURITY_FEATURES.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={index}
                    className="p-8 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
                    whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={prefersReducedMotion ? {} : { y: -4 }}
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl mb-6 shadow-safenode-secondary">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Security Guarantees */}
        <section className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2
              className="text-4xl font-extrabold text-slate-900 dark:text-white text-center mb-16"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Security Guarantees
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SECURITY_GUARANTEES.map((guarantee, index) => (
                <motion.div
                  key={index}
                  className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {guarantee.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {guarantee.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-20 lg:py-32">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
              whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-8">
                Trusted by Security Experts
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed">
                Our security architecture has been reviewed by independent security researchers.
                We follow industry best practices and continuously improve our security posture.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { label: '256-bit Encryption', icon: '🔒' },
                  { label: 'Zero-Knowledge', icon: '✅' },
                  { label: 'Open Source Audited', icon: '📖' },
                  { label: 'Regular Security Reviews', icon: '🛡️' }
                ].map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-secondary-600 via-secondary-500 to-secondary-600 dark:from-secondary-700 dark:via-secondary-600 dark:to-secondary-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h2
              className="text-4xl md:text-5xl font-extrabold text-white mb-6"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Experience Secure Password Management
            </motion.h2>
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

export default SecurityPage

