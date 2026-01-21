import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Hero from '../components/marketing/Hero'
import Features from '../components/marketing/Features'
import Testimonials from '../components/marketing/Testimonials'
import Platforms from '../components/marketing/Platforms'
import CTASection from '../components/marketing/CTASection'
import Footer from '../components/marketing/Footer'
import Logo from '../components/Logo'

interface HomeProps {
  onEnterApp: (mode?: 'signup' | 'login') => void;
}

const Home: React.FC<HomeProps> = ({ onEnterApp }) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav 
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="flex justify-between items-center h-16"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3">
              <Logo variant="nav" />
              <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">
                  SafeNode
                </h1>
              </Link>
            </div>
            
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="Main navigation links">
                <a 
                  href="#features" 
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary-500 rounded px-2 py-1"
                >
                  Features
                </a>
                <Link 
                  to="/pricing"
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary-500 rounded px-2 py-1"
                >
                  Pricing
                </Link>
                <Link 
                  to="/security"
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary-500 rounded px-2 py-1"
                >
                  Security
                </Link>
                <Link 
                  to="/downloads"
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary-500 rounded px-2 py-1"
                >
                  Download
                </Link>
              </nav>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => onEnterApp('login')}
                  className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary-500 rounded-lg"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  Sign In
                </motion.button>
                <motion.button
                  onClick={() => onEnterApp('signup')}
                  className="px-5 py-2.5 bg-gradient-to-r from-secondary-600 to-secondary-500 hover:from-secondary-700 hover:to-secondary-600 dark:from-secondary-500 dark:to-secondary-400 dark:hover:from-secondary-600 dark:hover:to-secondary-500 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-safenode-secondary hover:shadow-safenode-secondary-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  aria-label="Get started with SafeNode - Create free account"
                >
                  Get started
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </nav>

      {/* Main Content */}
      <main role="main">
        <Hero onEnterApp={onEnterApp} />
        <Features />
        <Testimonials />
        <Platforms />
        <CTASection onEnterApp={onEnterApp} />
      </main>

      <Footer />
    </div>
  )
}

export default Home
