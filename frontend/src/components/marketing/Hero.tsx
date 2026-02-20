/**
 * Hero Section - Modern Next.js / Vercel Inspired
 * Clean, minimal, high-impact
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Shield, Lock, Zap } from 'lucide-react';

interface HeroProps {
  onEnterApp: (mode?: 'signup' | 'login') => void;
}

export const Hero: React.FC<HeroProps> = ({ onEnterApp }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-white">
      {/* Subtle grid background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-gray-100/80 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-50 text-gray-600 text-sm font-medium mb-8 border border-gray-200/60"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Open Source &amp; Audited
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-950 mb-6 leading-[1.08] tracking-tight"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Your Vault. Your Keys.
            <br />
            <span className="bg-gradient-to-r from-gray-950 via-gray-600 to-gray-950 bg-clip-text text-transparent">
              Zero Exceptions.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            All encryption happens on your device. Our servers never see your passwords. We can't access your data — by design, not by policy.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.button
              onClick={() => onEnterApp('signup')}
              className="group px-7 py-3.5 bg-gray-950 hover:bg-gray-800 text-white text-base font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-gray-950/10 hover:shadow-xl hover:shadow-gray-950/20"
              whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              <span className="flex items-center gap-2">
                Get Started Free
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </motion.button>
            <motion.button
              onClick={() => onEnterApp('login')}
              className="px-7 py-3.5 bg-white border border-gray-200 text-gray-700 text-base font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
              whileHover={prefersReducedMotion ? {} : { scale: 1.02, y: -2 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              Sign In
            </motion.button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>AES-256 Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Open Source</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Always Free</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
