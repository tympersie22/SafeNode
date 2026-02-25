import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, ArrowRight, Shield, KeyRound, ServerCrash } from 'lucide-react'
import Logo from '../../components/Logo'
import Footer from '../../components/marketing/Footer'

type Post = {
  title: string
  date: string
  readTime: string
  category: string
  excerpt: string
  icon: React.ComponentType<{ className?: string }>
}

const posts: Post[] = [
  {
    title: 'How SafeNode Implements Zero-Knowledge Encryption',
    date: 'February 24, 2026',
    readTime: '6 min read',
    category: 'Architecture',
    excerpt: 'A practical breakdown of our client-side encryption model, key derivation, and sync boundaries.',
    icon: Shield
  },
  {
    title: 'Incident Playbooks: What Happens During API Degradation',
    date: 'February 20, 2026',
    readTime: '5 min read',
    category: 'Reliability',
    excerpt: 'The operational checklist we follow when auth, sync, or vault endpoints degrade in production.',
    icon: ServerCrash
  },
  {
    title: 'Master Password Design: Balancing Security and Recovery',
    date: 'February 18, 2026',
    readTime: '4 min read',
    category: 'Security',
    excerpt: 'Why SafeNode never stores your master password and how to build safer recovery flows around it.',
    icon: KeyRound
  }
]

const BlogPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Logo variant="nav" />
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">
                SafeNode
              </Link>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link to="/security" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Security</Link>
              <Link to="/careers" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Careers</Link>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <p className="text-xs tracking-[0.18em] uppercase text-secondary-600 dark:text-secondary-400 font-semibold mb-3">SafeNode Journal</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Security Engineering, Product Notes, and Incidents</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-3xl">
            Updates from the SafeNode team on encryption architecture, reliability improvements, release operations, and security practices.
          </p>
        </motion.div>

        <div className="grid gap-5 mt-10">
          {posts.map((post, idx) => (
            <motion.article
              key={post.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-white dark:bg-slate-800/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-secondary-100 dark:bg-secondary-900/35 flex items-center justify-center">
                  <post.icon className="w-4 h-4 text-secondary-700 dark:text-secondary-300" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-secondary-700 dark:text-secondary-300">{post.category}</span>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{post.title}</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2">{post.excerpt}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
                <button className="inline-flex items-center gap-1 text-sm font-semibold text-secondary-700 dark:text-secondary-300">
                  Read post <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default BlogPage
