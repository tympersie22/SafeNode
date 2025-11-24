/**
 * Contact Page
 * Marketing page for contacting SafeNode support
 */

import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

const CONTACT_METHODS = [
  {
    icon: '📧',
    title: 'Email Support',
    description: 'Get help from our support team',
    contact: 'support@safenode.app',
    action: 'mailto:support@safenode.app'
  },
  {
    icon: '💼',
    title: 'Sales Inquiries',
    description: 'Contact our sales team',
    contact: 'sales@safenode.app',
    action: 'mailto:sales@safenode.app'
  },
  {
    icon: '🔒',
    title: 'Security Issues',
    description: 'Report security vulnerabilities',
    contact: 'security@safenode.app',
    action: 'mailto:security@safenode.app'
  },
  {
    icon: '💬',
    title: 'Community Forum',
    description: 'Join our community',
    contact: 'community.safenode.app',
    action: 'https://community.safenode.app'
  }
]

const FAQ_CATEGORIES = [
  {
    category: 'General',
    questions: [
      { q: 'What is SafeNode?', a: 'SafeNode is a zero-knowledge password manager that keeps your passwords encrypted and private.' },
      { q: 'Is SafeNode free?', a: 'Yes! We offer a free tier with unlimited passwords. Paid plans unlock additional features.' }
    ]
  },
  {
    category: 'Technical',
    questions: [
      { q: 'How does encryption work?', a: 'We use AES-256-GCM encryption with Argon2id key derivation. Your master password never leaves your device.' },
      { q: 'Can I use SafeNode offline?', a: 'Yes! Your vault is stored locally, so you can access passwords even without internet.' }
    ]
  },
  {
    category: 'Billing',
    questions: [
      { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time. Your account remains active until the end of your billing period.' },
      { q: 'Do you offer refunds?', a: 'Yes, we offer a 30-day money-back guarantee for all paid plans.' }
    ]
  }
]

export const ContactPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // In production, this would send to your backend
    await new Promise(resolve => setTimeout(resolve, 1000))
    alert('Thank you for contacting us! We\'ll get back to you soon.')
    setFormData({ name: '', email: '', subject: '', message: '' })
    setSubmitting(false)
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
              Get in Touch
            </motion.h1>
            <motion.p
              className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Have a question? We're here to help. Reach out to our team or check our FAQ.
            </motion.p>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {CONTACT_METHODS.map((method, index) => (
                <motion.a
                  key={index}
                  href={method.action}
                  className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-secondary-300 dark:hover:border-secondary-600 transition-all text-center"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={prefersReducedMotion ? {} : { y: -4 }}
                >
                  <div className="text-4xl mb-4">{method.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {method.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {method.description}
                  </p>
                  <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    {method.contact}
                  </p>
                </motion.a>
              ))}
            </div>

            {/* Contact Form */}
            <div className="max-w-2xl mx-auto">
              <motion.div
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                  Send us a Message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary-500"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary-500"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary-500"
                      placeholder="What's this about?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Message
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary-500 resize-none"
                      placeholder="Tell us how we can help..."
                    />
                  </div>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3 bg-gradient-to-r from-secondary-600 to-secondary-500 hover:from-secondary-700 hover:to-secondary-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-safenode-secondary hover:shadow-safenode-secondary-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!submitting && !prefersReducedMotion ? { scale: 1.02 } : {}}
                    whileTap={!submitting && !prefersReducedMotion ? { scale: 0.98 } : {}}
                  >
                    {submitting ? 'Sending...' : 'Send Message'}
                  </motion.button>
                </form>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-8">
              {FAQ_CATEGORIES.map((category, catIdx) => (
                <div key={catIdx}>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    {category.category}
                  </h3>
                  <div className="space-y-4">
                    {category.questions.map((qa, qIdx) => (
                      <motion.div
                        key={qIdx}
                        className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700"
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: (catIdx * 0.2) + (qIdx * 0.1) }}
                      >
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                          {qa.q}
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400">
                          {qa.a}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default ContactPage

