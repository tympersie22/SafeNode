import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Fingerprint, KeyRound, ShieldCheck } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: Fingerprint,
    title: 'Prove it is you',
    description: 'A device-bound passkey verifies your identity without sending a reusable sign-in password.'
  },
  {
    number: '02',
    icon: KeyRound,
    title: 'Unlock locally',
    description: 'The vault key is unwrapped on your device. Safenode stores encrypted material, never the plaintext key.'
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Recover deliberately',
    description: 'Recovery kits, trusted devices, and team policy give access a controlled path back without silent escrow.'
  }
] as const

export const SecurityWorkflow: React.FC = () => {
  const reducedMotion = useReducedMotion()

  return (
    <section className="sn-section bg-[var(--sn-ink)] text-white" aria-labelledby="protection-heading">
      <div className="sn-marketing-container grid gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
        >
          <p className="sn-eyebrow text-[var(--sn-accent-soft)]">Protection model</p>
          <h2 id="protection-heading" className="sn-display mt-6 max-w-md text-white">
            Three proofs. No security theatre.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-white/60">
            Authentication, decryption, and recovery are separate responsibilities. That separation is what keeps a lost session from becoming a lost identity.
          </p>
        </motion.div>

        <ol className="border-t border-white/15">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.number}
              className="grid gap-5 border-b border-white/15 py-8 sm:grid-cols-[64px_1fr_auto] sm:items-start"
              initial={reducedMotion ? false : { opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: index * 0.08 }}
            >
              <span className="font-mono text-xs tracking-[0.2em] text-white/35">{step.number}</span>
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.02em]">{step.title}</h3>
                <p className="mt-2 max-w-xl leading-7 text-white/58">{step.description}</p>
              </div>
              <step.icon className="hidden h-6 w-6 text-[var(--sn-accent-soft)] sm:block" aria-hidden="true" />
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default SecurityWorkflow
