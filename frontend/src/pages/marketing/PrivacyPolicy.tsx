/**
 * Privacy Policy Page
 * Public-facing privacy policy for SafeNode
 */

import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

export const PrivacyPolicyPage: React.FC = () => {
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
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-10">Last updated: February 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeNode ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our password management service. SafeNode is built on a zero-knowledge architecture, meaning we cannot access your encrypted vault data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Account Information</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Email address (for account creation and communication)</li>
              <li>Display name (optional)</li>
              <li>Password hash (we never store your master password in plain text)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Encrypted Vault Data</h3>
            <p className="text-gray-600 leading-relaxed">
              Your vault data is encrypted end-to-end using AES-256-GCM encryption with keys derived from your master password via Argon2id. We store only the encrypted blob and cannot decrypt or read your passwords, notes, or other vault contents.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Usage & Technical Data</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Device information (for device management and security)</li>
              <li>IP address and user agent (for security audit logs)</li>
              <li>Subscription and billing status</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Zero-Knowledge Architecture</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeNode uses a zero-knowledge encryption model. Your master password is never sent to or stored on our servers. Encryption and decryption happen entirely on your device. This means that even SafeNode staff cannot access your vault data. If you lose your master password, we cannot recover your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>To provide and maintain the SafeNode service</li>
              <li>To authenticate your identity and manage your account</li>
              <li>To process billing and subscriptions</li>
              <li>To send transactional emails (verification, password reset)</li>
              <li>To detect and prevent security threats</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><strong>Stripe</strong> — for payment processing. Stripe may collect payment information directly. See Stripe's privacy policy.</li>
              <li><strong>Resend / SendGrid</strong> — for transactional email delivery.</li>
              <li><strong>Vercel</strong> — for application hosting.</li>
              <li><strong>Supabase</strong> — for database hosting (stores encrypted data only).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your account and encrypted vault data for as long as your account is active. You may delete your account at any time from your account settings, which permanently removes all associated data including your encrypted vault, devices, audit logs, and subscription records.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures including AES-256-GCM encryption, Argon2id password hashing, JWT authentication with token versioning, rate limiting, and HTTPS-only communication. Our infrastructure includes security headers (CSP, HSTS, X-Frame-Options) and regular security monitoring.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Access your account information</li>
              <li>Update or correct your account details</li>
              <li>Delete your account and all associated data</li>
              <li>Export your vault data (via the application)</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              SafeNode uses minimal cookies. We may use an HTTP-only authentication cookie for session management and local storage for application preferences. We do not use tracking cookies or third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
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

export default PrivacyPolicyPage
