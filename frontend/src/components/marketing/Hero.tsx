import React from 'react'
import { motion } from 'framer-motion'
import Button from '../ui/Button'
import { LockIcon } from '../icons'

interface HeroProps {
  onEnterApp: (mode?: 'signup' | 'login') => void;
}

const Hero: React.FC<HeroProps> = ({ onEnterApp }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(168,85,247,0.15)_1px,transparent_0)] bg-[length:20px_20px] opacity-30"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo */}
          <motion.div 
            className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-xl shadow-lg mb-8"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <LockIcon className="w-8 h-8 text-white" />
          </motion.div>

          {/* Headline */}
          <motion.h1 
            className="text-4xl md:text-6xl font-bold mb-6 text-slate-900"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Your passwords,<br />
            <span className="text-purple-600">your control</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            A password manager that actually respects your privacy. 
            No data collection, no tracking, no BS.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Button
              onClick={() => onEnterApp('signup')}
              variant="primary"
              size="lg"
              className="px-6 py-3 text-base font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get started free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-6 py-3 text-base font-medium text-slate-700 border-slate-300 hover:bg-slate-50 rounded-lg transition-all duration-200"
            >
              View source code
            </Button>
          </motion.div>

          {/* Simple Benefits */}
          <motion.div 
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Actually private</h3>
                    <p className="text-sm text-slate-600">Your data never leaves your device unencrypted. We cancancan'tapos;tapos;t see your passwords even if we wanted to.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Open source</h3>
                    <p className="text-sm text-slate-600">Full transparency. Audit the code, contribute features, or run your own instance.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">No subscription</h3>
                    <p className="text-sm text-slate-600">Free forever. No premium tiers, no feature gates, no monthly fees.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Works offline</h3>
                    <p className="text-sm text-slate-600">Your vault works without internet. Sync when you want, not when we want.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
