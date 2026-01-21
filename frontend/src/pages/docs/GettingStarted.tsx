/**
 * Getting Started Documentation Page
 * User onboarding guide
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

export const GettingStartedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="prose prose-slate dark:prose-invert max-w-none"
        >
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
            Getting Started with SafeNode
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Welcome to SafeNode! This guide will help you get started with your secure password manager.
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Account Setup</h2>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3">Creating Your Account</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Visit SafeNode at your deployment URL</li>
              <li>Click "Sign Up" on the home page</li>
              <li>Enter your email and create a strong password</li>
              <li>Verify your email (check your inbox for a verification link)</li>
              <li>Log in with your credentials</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Master Password</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              Your <strong>master password</strong> is the key to your encrypted vault. It never leaves your device and is required to unlock your vault.
            </p>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3">Creating a Strong Master Password</h3>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">Do:</h4>
              <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-300">
                <li>Use at least 16 characters</li>
                <li>Mix uppercase, lowercase, numbers, and symbols</li>
                <li>Use a passphrase (e.g., "Correct-Horse-Battery-Staple")</li>
                <li>Store it securely (password manager or physical safe)</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">Don't:</h4>
              <ul className="list-disc list-inside space-y-1 text-red-800 dark:text-red-300">
                <li>Use personal information (name, birthday, etc.)</li>
                <li>Reuse passwords from other accounts</li>
                <li>Share it with anyone</li>
                <li>Store it in plain text on your device</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Adding Your First Entry</h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Click the "+" button or "Add Entry"</li>
              <li>Fill in the entry details (name, username, password, URL)</li>
              <li>Use the password generator for strong passwords</li>
              <li>Add tags and categories for organization</li>
              <li>Save the entry</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Syncing Across Devices</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              SafeNode automatically syncs your encrypted vault across all your devices. Your data is encrypted end-to-end, so only you can access it.
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Install SafeNode on all your devices</li>
              <li>Log in with the same account</li>
              <li>Your vault will sync automatically</li>
              <li>Changes sync in real-time when online</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Security Features</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li><strong>Zero-knowledge encryption:</strong> Your data is encrypted before it leaves your device</li>
              <li><strong>Biometric unlock:</strong> Use Face ID, Touch ID, or Windows Hello</li>
              <li><strong>Auto-lock:</strong> Vault locks automatically after inactivity</li>
              <li><strong>Breach monitoring:</strong> Get alerts if your passwords appear in data breaches</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Tips & Best Practices</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Use unique passwords for every account</li>
              <li>Enable two-factor authentication where available</li>
              <li>Regularly review and update your passwords</li>
              <li>Use the password generator for strong passwords</li>
              <li>Organize entries with tags and categories</li>
            </ul>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <p className="text-slate-600 dark:text-slate-400">
              Need more help? <Link to="/contact" className="text-secondary-600 dark:text-secondary-400 hover:underline">Contact support</Link> or check out our <Link to="/docs/security" className="text-secondary-600 dark:text-secondary-400 hover:underline">security guide</Link>.
            </p>
          </div>
        </motion.article>
      </main>

      <Footer />
    </div>
  )
}

export default GettingStartedPage

