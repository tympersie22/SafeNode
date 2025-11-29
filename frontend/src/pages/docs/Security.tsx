/**
 * Security Documentation Page
 * Security and privacy guide
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

export const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <Logo variant="nav" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">
                SafeNode
              </h1>
            </Link>
            <Link
              to="/"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="prose prose-slate dark:prose-invert max-w-none"
        >
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
            Security & Privacy
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Learn how SafeNode protects your data with zero-knowledge encryption and security best practices.
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Zero-Knowledge Architecture</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              SafeNode uses <strong>zero-knowledge encryption</strong>, meaning your master password and encryption keys never leave your device. We cannot access your data, even if we wanted to.
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Data is encrypted on your device before syncing</li>
              <li>Only you have the decryption key (your master password)</li>
              <li>Server cannot decrypt your vault</li>
              <li>End-to-end encryption for all data</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Encryption Standards</h2>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Encryption Algorithm</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                <li><strong>AES-256-GCM:</strong> Industry-standard symmetric encryption</li>
                <li><strong>Argon2id:</strong> Key derivation function (memory-hard, resistant to GPU attacks)</li>
                <li><strong>PBKDF2:</strong> Additional key stretching (100,000+ iterations)</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Security Features</h2>
            <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Biometric Authentication</h3>
                <p className="text-slate-700 dark:text-slate-300">Use Face ID, Touch ID, or Windows Hello for quick and secure unlock</p>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Auto-Lock</h3>
                <p className="text-slate-700 dark:text-slate-300">Vault automatically locks after inactivity to protect your data</p>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Breach Monitoring</h3>
                <p className="text-slate-700 dark:text-slate-300">Get alerts if your passwords appear in known data breaches</p>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Two-Factor Authentication</h3>
                <p className="text-slate-700 dark:text-slate-300">Add an extra layer of security to your account</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Privacy</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>We don't track your activity or collect personal data</li>
              <li>No analytics or telemetry on your vault contents</li>
              <li>Open-source code for transparency</li>
              <li>GDPR and CCPA compliant</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Security Best Practices</h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">For Users</h3>
              <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-300">
                <li>Use a strong, unique master password</li>
                <li>Enable biometric unlock</li>
                <li>Keep your devices secure</li>
                <li>Regularly update the app</li>
                <li>Enable two-factor authentication</li>
              </ul>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <p className="text-slate-600 dark:text-slate-400">
              Questions about security? <Link to="/contact" className="text-secondary-600 dark:text-secondary-400 hover:underline">Contact our security team</Link>.
            </p>
          </div>
        </motion.article>
      </main>

      <Footer />
    </div>
  )
}

export default SecurityPage

