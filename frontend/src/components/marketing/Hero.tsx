import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Fingerprint, KeyRound, Shield } from 'lucide-react'

interface HeroProps {
  onEnterApp: (mode?: 'signup' | 'login') => void
}

export const Hero: React.FC<HeroProps> = ({ onEnterApp }) => {
  const reducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden border-b border-[var(--sn-line)]">
      <div className="sn-hero-grid" aria-hidden="true" />
      <div className="sn-marketing-container relative grid min-h-[760px] items-center gap-14 py-20 lg:grid-cols-[1.08fr_0.92fr] lg:py-28">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
        >
          <div className="sn-eyebrow flex items-center gap-3">
            <span className="h-2 w-2 bg-[var(--sn-accent)]" />
            Passkey-first security infrastructure
          </div>
          <h1 className="sn-hero-title mt-7 max-w-3xl">
            Your digital identity needs more than a password manager.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--sn-muted)] sm:text-xl">
            SafeNode brings passkeys, zero-knowledge secrets, recovery, and trusted devices into one dependable control plane.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <motion.button
              className="sn-solid-button min-h-12 px-6"
              onClick={() => onEnterApp('signup')}
              whileHover={reducedMotion ? undefined : { y: -2 }}
              whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            >
              Start with a passkey <ArrowRight className="h-4 w-4" />
            </motion.button>
            <button className="sn-outline-button min-h-12 px-6" onClick={() => onEnterApp('login')}>
              Open existing vault
            </button>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-[var(--sn-line)] pt-6 text-sm text-[var(--sn-muted)]">
            {['No reusable login password', 'Client-side decryption', 'Recovery by design'].map((label) => (
              <span key={label} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--sn-accent)]" /> {label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="relative"
          initial={reducedMotion ? false : { opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, delay: 0.12 }}
        >
          <div className="sn-system-panel">
            <div className="flex items-center justify-between border-b border-white/12 pb-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">Identity graph</p>
                <p className="mt-2 text-sm font-medium text-white">Protected session</p>
              </div>
              <span className="flex items-center gap-2 text-xs text-[var(--sn-accent-soft)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--sn-accent-soft)]" /> Live
              </span>
            </div>

            <div className="space-y-2 py-7">
              {[
                { icon: Fingerprint, label: 'Identity proof', value: 'Device passkey', state: 'verified' },
                { icon: KeyRound, label: 'Vault boundary', value: 'Local key unwrap', state: 'private' },
                { icon: Shield, label: 'Recovery posture', value: 'Kit + trusted device', state: 'ready' }
              ].map((row, index) => (
                <div key={row.label} className="relative grid grid-cols-[44px_1fr_auto] items-center gap-4 py-4">
                  {index < 2 && <span className="absolute left-[21px] top-[54px] h-[22px] w-px bg-white/15" />}
                  <span className="flex h-11 w-11 items-center justify-center border border-white/15 bg-white/[0.04]">
                    <row.icon className="h-5 w-5 text-[var(--sn-accent-soft)]" />
                  </span>
                  <div>
                    <p className="text-xs text-white/42">{row.label}</p>
                    <p className="mt-1 text-sm font-medium text-white/90">{row.value}</p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">{row.state}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 border-t border-white/12 pt-5">
              {[
                ['0', 'plaintext keys'],
                ['3', 'recovery layers'],
                ['1', 'trusted session']
              ].map(([value, label]) => (
                <div key={label} className="border-l border-white/12 px-4 first:border-l-0 first:pl-0">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/35">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 hidden border border-[var(--sn-line)] bg-[var(--sn-canvas)] px-5 py-4 text-xs text-[var(--sn-muted)] shadow-[var(--sn-shadow)] sm:block">
            <span className="font-mono text-[var(--sn-accent)]">ZK / 01</span>
            <span className="ml-4">The server never sees your vault key.</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
