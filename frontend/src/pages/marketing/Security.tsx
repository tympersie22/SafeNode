import React from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Lock, KeyRound, Eye, Server, AlertOctagon, FileCheck2, Workflow } from 'lucide-react'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

const controls = [
  {
    icon: Lock,
    title: 'Client-side AES-256-GCM encryption',
    detail: 'Vault data is encrypted before transmission. The server stores ciphertext, IV, and metadata only.'
  },
  {
    icon: KeyRound,
    title: 'Argon2id key derivation',
    detail: 'Master-password-derived keys are hardened against GPU-assisted brute-force attempts.'
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
  const navigate = useNavigate()

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
              <Link to="/blog" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Blog</Link>
              <Link to="/careers" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Careers</Link>
              <Link to="/contact" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Contact</Link>
              <button onClick={() => navigate('/auth')} className="px-4 py-2 bg-gradient-to-r from-secondary-600 to-secondary-500 text-white text-sm font-semibold rounded-lg">Open Vault</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
          <p className="text-xs tracking-[0.18em] uppercase text-secondary-600 dark:text-secondary-400 font-semibold mb-3">Security Architecture</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Security Controls Built Into the Product, Not Bolted On</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            SafeNode is built with a default assumption that compromise attempts are normal. Encryption, auth, and operational checks are treated as core product behavior.
          </p>
        </motion.section>

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
            <Link to="/contact" className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-semibold">
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
