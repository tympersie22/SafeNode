import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, ArrowRight } from 'lucide-react'
import MarketingHeader from '../../components/marketing/MarketingHeader'
import Footer from '../../components/marketing/Footer'
import AppFeatureRibbon from '../../components/marketing/AppFeatureRibbon'
import { blogPosts } from './blogData'

const BlogPage: React.FC = () => {
  return (
    <div className="sn-page min-h-screen">
      <MarketingHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <p className="text-xs tracking-[0.18em] uppercase text-secondary-600 dark:text-secondary-400 font-semibold mb-3">Safenode Journal</p>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Security Engineering, Product Notes, and Incidents</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-3xl">
            Updates from the Safenode team on encryption architecture, reliability improvements, release operations, and security practices.
          </p>
        </motion.div>

        <AppFeatureRibbon />

        <div className="grid gap-5 mt-10">
          {blogPosts.map((post, idx) => (
            <motion.article
              key={post.slug}
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
                <Link to={`/blog/${post.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-secondary-700 dark:text-secondary-300">
                  Read post <ArrowRight className="w-4 h-4" />
                </Link>
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
