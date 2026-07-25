import React from 'react'
import { motion } from 'framer-motion'
import MarketingHeader from './MarketingHeader'
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
  return (
    <div className="sn-page min-h-screen">
      <MarketingHeader />

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
