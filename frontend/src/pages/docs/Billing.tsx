/**
 * Billing Documentation Page
 * Subscription and billing guide
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

export const BillingPage: React.FC = () => {
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
            Billing & Subscriptions
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Learn about SafeNode subscription plans, billing, and payment management.
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Subscription Plans</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Free</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">$0/month</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                  <li>Up to 50 entries</li>
                  <li>Basic sync</li>
                  <li>Mobile & desktop apps</li>
                </ul>
              </div>
              <div className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-6 bg-secondary-50 dark:bg-secondary-900/20">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Individual</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">$5/month</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                  <li>Unlimited entries</li>
                  <li>Priority sync</li>
                  <li>Advanced security features</li>
                </ul>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Family</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">$10/month</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                  <li>Up to 5 family members</li>
                  <li>Shared family vault</li>
                  <li>All Individual features</li>
                </ul>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Teams</h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">$20/month</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                  <li>Team vaults</li>
                  <li>Role-based access</li>
                  <li>Audit logs</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Managing Your Subscription</h2>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3">Upgrading</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Go to Settings → Billing</li>
              <li>Click "Upgrade Plan"</li>
              <li>Select your desired plan</li>
              <li>Enter payment information</li>
              <li>Confirm the upgrade</li>
            </ol>

            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-6">Canceling</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Go to Settings → Billing</li>
              <li>Click "Cancel Subscription"</li>
              <li>Confirm cancellation</li>
              <li>Your subscription remains active until the end of the billing period</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Payment Methods</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              We accept all major credit cards and process payments securely through Stripe. Your payment information is never stored on our servers.
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
              <li>Visa, Mastercard, American Express</li>
              <li>Secure payment processing via Stripe</li>
              <li>Automatic billing renewal</li>
              <li>Email receipts for all transactions</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Billing FAQs</h2>
            <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">When am I charged?</h3>
                <p className="text-slate-700 dark:text-slate-300">You're charged at the beginning of each billing cycle (monthly or annually).</p>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Can I get a refund?</h3>
                <p className="text-slate-700 dark:text-slate-300">Yes, we offer a 30-day money-back guarantee for new subscriptions.</p>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">What happens if my payment fails?</h3>
                <p className="text-slate-700 dark:text-slate-300">We'll notify you and retry the payment. Your account will be downgraded to Free if payment continues to fail.</p>
              </div>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <p className="text-slate-600 dark:text-slate-400">
              Need help with billing? <Link to="/contact" className="text-secondary-600 dark:text-secondary-400 hover:underline">Contact support</Link>.
            </p>
          </div>
        </motion.article>
      </main>

      <Footer />
    </div>
  )
}

export default BillingPage

