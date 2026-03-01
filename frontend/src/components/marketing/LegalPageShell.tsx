import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Logo from '../Logo'
import Footer from './Footer'
import AppFeatureRibbon from './AppFeatureRibbon'

interface LegalPageShellProps {
  eyebrow: string
  title: string
  summary: string
  lastUpdated: string
  children: React.ReactNode
}

export const LegalPageShell: React.FC<LegalPageShellProps> = ({
  eyebrow,
  title,
  summary,
  lastUpdated,
  children
}) => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Logo variant="nav" />
              <Link
                to="/"
                className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent"
              >
                SafeNode
              </Link>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link to="/pricing" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Pricing</Link>
              <Link to="/security" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Security</Link>
              <Link to="/contact" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Contact</Link>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-gradient-to-r from-secondary-600 to-secondary-500 text-white text-sm font-semibold rounded-lg"
              >
                Open Vault
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
          <p className="text-xs tracking-[0.18em] uppercase text-secondary-600 dark:text-secondary-400 font-semibold mb-3">{eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">{title}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl">{summary}</p>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-500">Last updated: {lastUpdated}</p>
        </motion.section>

        <AppFeatureRibbon />

        <section className="max-w-4xl mt-10 border border-slate-200 dark:border-slate-700 rounded-3xl bg-white/90 dark:bg-slate-900/70 shadow-sm px-6 sm:px-8 py-8">
          <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 dark:prose-headings:text-white dark:prose-p:text-slate-400 dark:prose-li:text-slate-400">
            {children}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LegalPageShell
