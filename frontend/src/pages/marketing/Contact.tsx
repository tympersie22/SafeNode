import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ShieldAlert, Briefcase, Send } from 'lucide-react'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'
import AppFeatureRibbon from '../../components/marketing/AppFeatureRibbon'
import { showToast } from '../../components/ui/Toast'
import { Spinner } from '../../components/ui/Spinner'

const ContactPage: React.FC = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    team: '',
    subject: '',
    message: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      showToast.success('Message queued. The SafeNode team will reply shortly.')
      setFormData({ name: '', email: '', team: '', subject: '', message: '' })
    } catch {
      showToast.error('Unable to send message right now. Please email support directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Logo variant="nav" />
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">SafeNode</Link>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link to="/security" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Security</Link>
              <Link to="/blog" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Blog</Link>
              <Link to="/careers" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Careers</Link>
              <button onClick={() => navigate('/auth')} className="px-4 py-2 bg-gradient-to-r from-secondary-600 to-secondary-500 text-white text-sm font-semibold rounded-lg">Open Vault</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <p className="text-xs tracking-[0.18em] uppercase text-secondary-600 dark:text-secondary-400 font-semibold mb-3">Contact</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Talk to the SafeNode Team</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Reach product, support, and security engineering from one place. For urgent incidents, use the security contact channel.
          </p>
        </motion.div>

        <AppFeatureRibbon />

        <section className="grid lg:grid-cols-3 gap-5 mt-10">
          <div className="space-y-4 lg:col-span-1">
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-800/50">
              <Mail className="w-5 h-5 text-secondary-600 dark:text-secondary-300 mb-2" />
              <h2 className="font-semibold text-slate-900 dark:text-white">General Support</h2>
              <a className="text-sm text-secondary-700 dark:text-secondary-300" href="mailto:support@safe-node.app">support@safe-node.app</a>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-800/50">
              <ShieldAlert className="w-5 h-5 text-secondary-600 dark:text-secondary-300 mb-2" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Security Reports</h2>
              <a className="text-sm text-secondary-700 dark:text-secondary-300" href="mailto:security@safe-node.app">security@safe-node.app</a>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-800/50">
              <Briefcase className="w-5 h-5 text-secondary-600 dark:text-secondary-300 mb-2" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Partnerships</h2>
              <a className="text-sm text-secondary-700 dark:text-secondary-300" href="mailto:partners@safe-node.app">partners@safe-node.app</a>
            </div>
          </div>

          <div className="lg:col-span-2 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Message Form</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Full name"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Work email"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  name="team"
                  value={formData.team}
                  onChange={handleChange}
                  placeholder="Company / team"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                >
                  <option value="">Select subject</option>
                  <option value="support">Technical support</option>
                  <option value="security">Security report</option>
                  <option value="compliance">Compliance questionnaire</option>
                  <option value="sales">Sales / enterprise</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                placeholder="Tell us what you need and your timeline"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send message
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default ContactPage
