import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Laptop, Globe, ArrowRight } from 'lucide-react'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

type Role = {
  title: string
  team: string
  location: string
  type: string
  summary: string
}

const roles: Role[] = [
  {
    title: 'Senior Security Engineer',
    team: 'Platform Security',
    location: 'Remote (US/EU)',
    type: 'Full-time',
    summary: 'Own threat modeling, auth hardening, and security reviews across frontend/backend/mobile.'
  },
  {
    title: 'Product Engineer, Vault Experience',
    team: 'Core Product',
    location: 'Remote (US)',
    type: 'Full-time',
    summary: 'Build secure, fast vault UX across web and desktop with a strong systems mindset.'
  },
  {
    title: 'Developer Relations Engineer',
    team: 'Ecosystem',
    location: 'Remote (Global)',
    type: 'Full-time',
    summary: 'Create docs, examples, and integration guidance for teams adopting SafeNode securely.'
  }
]

const CareersPage: React.FC = () => {
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
              <Link to="/security" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Security</Link>
              <Link to="/blog" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Blog</Link>
              <Link to="/contact" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Contact</Link>
              <button onClick={() => navigate('/auth')} className="px-4 py-2 bg-gradient-to-r from-secondary-600 to-secondary-500 text-white text-sm font-semibold rounded-lg">Open Vault</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.18em] uppercase text-secondary-600 dark:text-secondary-400 font-semibold mb-3">Careers</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Build Security Infrastructure People Actually Trust</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-3xl">
            We are building a zero-knowledge platform where user security is a product feature, not a compliance checkbox.
            We move quickly, document deeply, and ship reliable systems.
          </p>
        </motion.div>

        <section className="grid md:grid-cols-3 gap-4 mt-10">
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-800/50">
            <ShieldCheck className="w-5 h-5 text-secondary-600 dark:text-secondary-400 mb-2" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Security-first culture</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Threat models, incident drills, and clear ownership are part of day-to-day work.</p>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-800/50">
            <Laptop className="w-5 h-5 text-secondary-600 dark:text-secondary-400 mb-2" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Remote by default</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Async collaboration, strong written communication, and ownership over outcomes.</p>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-800/50">
            <Globe className="w-5 h-5 text-secondary-600 dark:text-secondary-400 mb-2" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Global impact</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Your work protects individuals and teams across web, mobile, and desktop.</p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Open Roles</h2>
          <div className="grid gap-4">
            {roles.map((role) => (
              <article key={role.title} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                  <span className="px-2 py-1 rounded-full bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300 font-semibold">{role.team}</span>
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{role.location}</span>
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{role.type}</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{role.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-2">{role.summary}</p>
                <a href="mailto:careers@safe-node.app?subject=Application%20-%20SafeNode" className="inline-flex mt-4 items-center gap-1 text-sm font-semibold text-secondary-700 dark:text-secondary-300">
                  Apply via email <ArrowRight className="w-4 h-4" />
                </a>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default CareersPage
