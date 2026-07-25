import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface CTASectionProps {
  onEnterApp: (mode?: 'signup' | 'login') => void
}

export const CTASection: React.FC<CTASectionProps> = ({ onEnterApp }) => {
  const reducedMotion = useReducedMotion()

  return (
    <section className="bg-[var(--sn-ink-fixed,#14201b)] px-5 pb-20 pt-10 text-white sm:px-8 lg:px-12">
      <motion.div
        className="mx-auto grid max-w-[1440px] gap-10 border-y border-white/15 py-16 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:py-24"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
      >
        <div>
          <p className="sn-eyebrow text-[var(--sn-accent-soft)]">Begin with identity</p>
          <h2 className="sn-display mt-6 max-w-4xl text-white">Build a recovery-ready security system before you need one.</h2>
        </div>
        <div className="lg:pb-2">
          <p className="max-w-lg leading-7 text-white/58">Create a passkey-first account, then bring your vault, devices, and team access under one clear operating model.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <button className="sn-light-button" onClick={() => onEnterApp('signup')}>
              Create account <ArrowRight className="h-4 w-4" />
            </button>
            <button className="sn-dark-outline-button" onClick={() => onEnterApp('login')}>Open vault</button>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

export default CTASection
