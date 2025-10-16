import React from 'react'
import { motion } from 'framer-motion'
import Hero from '../components/marketing/Hero'
import Features from '../components/marketing/Features'
import Platforms from '../components/marketing/Platforms'
import Footer from '../components/marketing/Footer'

interface LandingProps {
  onEnterApp: (mode?: 'signup' | 'login') => void;
}

const Landing: React.FC<LandingProps> = ({ onEnterApp }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="flex justify-between items-center h-16"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 rounded-xl shadow-lg shadow-purple-500/25">
                <svg className="w-5 h-5 text-white m-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                SafeNode
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors duration-200 text-sm font-medium">
                Features
              </a>
              <a href="#security" className="text-slate-600 hover:text-slate-900 transition-colors duration-200 text-sm font-medium">
                Security
              </a>
              <a href="https://github.com" className="text-slate-600 hover:text-slate-900 transition-colors duration-200 text-sm font-medium">
                GitHub
              </a>
              <motion.button
                onClick={() => onEnterApp('signup')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get started
              </motion.button>
            </div>
          </motion.div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Hero onEnterApp={onEnterApp} />
        <Features />

        <section id="security" className="py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Security is the product
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                SafeNode is built with a zero-trust mindset. Every decision—from encryption to sync—assumes attackers are watching.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Zero-knowledge by default',
                  description:
                    'Your master password never leaves your device. We can’t reset it, and we can’t see your data. Only you control your vault.',
                },
                {
                  title: 'Modern cryptography',
                  description:
                    'AES-256-GCM encryption paired with Argon2id key derivation. We rotate keys, salt everything, and design for future upgrades.',
                },
                {
                  title: 'Auditable and transparent',
                  description:
                    'SafeNode is open source. Read the code, trace how keys move, and verify the security model yourself—or with your team.',
                },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="card card-hover"
                >
                  <div className="card-body">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <Platforms />
      </main>

      <Footer />
    </div>
  )
}

export default Landing