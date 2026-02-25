/**
 * Terms of Service Page
 * Public-facing terms of service for SafeNode
 */

import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo variant="nav" />
            <span className="text-xl font-bold text-gray-900">SafeNode</span>
          </Link>
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
            Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-10">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By creating an account or using SafeNode, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service. SafeNode reserves the right to update these terms at any time. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeNode is a zero-knowledge password management service that stores your passwords and sensitive data in an encrypted vault. All encryption and decryption occurs on your device. SafeNode cannot access, read, or recover your vault data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Account Responsibilities</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>You are responsible for maintaining the security of your master password.</li>
              <li>You must provide accurate information during registration.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>You must notify us immediately of any unauthorized access.</li>
              <li>SafeNode cannot recover your data if you lose your master password.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Acceptable Use</h2>
            <p className="text-gray-600 leading-relaxed mb-2">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Use the service for illegal purposes</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Reverse engineer, decompile, or disassemble the software</li>
              <li>Distribute malware or harmful content through the service</li>
              <li>Abuse API rate limits or attempt denial-of-service attacks</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Subscriptions & Billing</h2>
            <p className="text-gray-600 leading-relaxed mb-2">
              SafeNode offers free and paid subscription plans. For paid plans:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Billing is processed through Stripe on a recurring basis.</li>
              <li>You may cancel your subscription at any time.</li>
              <li>Cancellations take effect at the end of the current billing period.</li>
              <li>Refunds are handled on a case-by-case basis.</li>
              <li>Downgrading to Free may limit feature access but your data is preserved.</li>
              <li>Prices may change with 30 days notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Data Ownership</h2>
            <p className="text-gray-600 leading-relaxed">
              You own all data you store in SafeNode. We do not claim any ownership over your vault contents, passwords, notes, or any other data you store. Since your data is encrypted with your master password, only you can access it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Service Availability</h2>
            <p className="text-gray-600 leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted service. We may perform maintenance that temporarily affects availability. We will provide reasonable notice for scheduled maintenance when possible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeNode is provided "as is" without warranties of any kind, express or implied. To the fullest extent permitted by law, SafeNode shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, revenue, or profits, arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Account Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              You may delete your account at any time. We may suspend or terminate accounts that violate these terms. Upon termination, your encrypted data will be permanently deleted. We are not responsible for preserving data after account deletion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeNode and its original content, features, and functionality are owned by SafeNode and are protected by international copyright, trademark, and other intellectual property laws. Your data remains your intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Questions about these Terms of Service should be directed to{' '}
              <a href="mailto:support@safe-node.app" className="text-gray-950 font-medium hover:underline">
                support@safe-node.app
              </a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default TermsOfServicePage
