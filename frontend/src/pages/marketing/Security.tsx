import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield, Lock, KeyRound, Eye, Server, AlertOctagon, FileCheck2, Workflow } from 'lucide-react'
import MarketingHeader from '../../components/marketing/MarketingHeader'
import Footer from '../../components/marketing/Footer'
import AppFeatureRibbon from '../../components/marketing/AppFeatureRibbon'

const controls = [
  {
    icon: Lock,
    title: 'Client-side AES-256-GCM encryption',
    detail: 'Vault data is encrypted before transmission. The server stores ciphertext, IV, and metadata only.'
  },
  {
    icon: KeyRound,
    title: 'Passkey-first and hardened vault access',
    detail: 'SafeNode is moving toward passkey-first authentication while preserving a zero-knowledge vault boundary and hardened local key derivation.'
  },
  {
    icon: Eye,
    title: 'Zero-knowledge model',
    detail: 'SafeNode does not hold the material required to decrypt customer vault contents.'
  },
  {
    icon: Server,
    title: 'Layered backend controls',
    detail: 'Rate limiting, strict CORS, auth versioning, and secure session boundaries reduce attack surface.'
  },
  {
    icon: AlertOctagon,
    title: 'Watchtower monitoring',
    detail: 'Weak/reused/breached credential detection is surfaced directly in user workflows.'
  },
  {
    icon: FileCheck2,
    title: 'Operational runbooks',
    detail: 'Incident and go-live checks are codified with reproducible scripts and rollback guidance.'
  },
  {
    icon: Workflow,
    title: 'Cross-platform security parity',
    detail: 'Security controls are designed for web, mobile, and desktop clients with shared expectations.'
  },
  {
    icon: Shield,
    title: 'Security transparency',
    detail: 'Public docs and release checks expose the controls we rely on in production.'
  }
]

const SecurityPage: React.FC = () => {
  return (
    <div className="sn-page min-h-screen">
      <MarketingHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
          <p className="text-xs tracking-[0.18em] uppercase text-secondary-600 dark:text-secondary-400 font-semibold mb-3">Security Architecture</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Security Controls Built Into Identity, Recovery, and Secret Access</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            SafeNode is built with a default assumption that compromise attempts are normal. Encryption, passkey-aware auth, recovery posture, and operational checks are treated as core product behavior.
          </p>
        </motion.section>

        <AppFeatureRibbon />

        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-10">
          {controls.map((control, idx) => (
            <motion.article
              key={control.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-800/50"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center mb-3">
                <control.icon className="w-5 h-5 text-secondary-700 dark:text-secondary-300" />
              </div>
              <h2 className="font-semibold text-slate-900 dark:text-white leading-tight">{control.title}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{control.detail}</p>
            </motion.article>
          ))}
        </section>

        <section className="mt-12 grid lg:grid-cols-2 gap-5">
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Deployment Expectations</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Use canonical domains only (`safe-node.app`, `api.safe-node.app`).</li>
              <li>Run preflight checks before production promotions.</li>
              <li>Verify RLS posture and auth paths after backend release.</li>
              <li>Confirm health and API smoke tests on live infrastructure.</li>
            </ul>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-gradient-to-br from-secondary-50 to-white dark:from-secondary-900/20 dark:to-slate-800">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Need a Security Review?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              For enterprise onboarding, compliance questionnaires, or architecture reviews, contact the team directly.
            </p>
            <Link to="/contact" className="btn btn-primary btn-sm">
              Contact Security Team
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default SecurityPage
