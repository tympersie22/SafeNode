import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Fingerprint, LifeBuoy, Users } from 'lucide-react'

const CAPABILITIES = [
  {
    marker: 'IDENTITY',
    icon: Fingerprint,
    title: 'Passkeys become the front door, not an optional extra.',
    description: 'Replace reusable sign-in credentials with device-backed identity proof and maintain a clear inventory of trusted access.',
    details: ['Passkey-first account access', 'Trusted-device visibility', 'Session and posture controls']
  },
  {
    marker: 'CONTINUITY',
    icon: LifeBuoy,
    title: 'Recovery is designed before an emergency happens.',
    description: 'Keep encrypted recovery material and explicit continuity paths ready without handing plaintext secrets to the service.',
    details: ['Recovery kit fallback', 'Successor access controls', 'No silent key escrow']
  },
  {
    marker: 'OPERATIONS',
    icon: Users,
    title: 'Team secrets live inside governed workspaces.',
    description: 'Separate personal records from operational access, with team membership and vault boundaries that remain understandable.',
    details: ['Dedicated team vaults', 'Role-aware access', 'Auditable security events']
  }
] as const

export const Features: React.FC = () => {
  const reducedMotion = useReducedMotion()

  return (
    <section id="features" className="sn-section border-b border-[var(--sn-line)]">
      <div className="sn-marketing-container">
        <div className="grid gap-8 border-b border-[var(--sn-line)] pb-14 lg:grid-cols-[0.75fr_1.25fr]">
          <p className="sn-eyebrow">What SafeNode protects</p>
          <h2 className="sn-display max-w-3xl">One security system across identity, continuity, and shared access.</h2>
        </div>

        <div>
          {CAPABILITIES.map((capability, index) => (
            <motion.article
              key={capability.marker}
              className="grid gap-8 border-b border-[var(--sn-line)] py-12 last:border-b-0 lg:grid-cols-[0.45fr_1.1fr_0.85fr] lg:items-start"
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: index * 0.06 }}
            >
              <div className="flex items-center gap-4">
                <capability.icon className="h-5 w-5 text-[var(--sn-accent)]" />
                <span className="font-mono text-[11px] tracking-[0.22em] text-[var(--sn-muted)]">{capability.marker}</span>
              </div>
              <div>
                <h3 className="max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.035em] text-[var(--sn-ink)] sm:text-3xl dark:text-white">
                  {capability.title}
                </h3>
                <p className="mt-4 max-w-2xl leading-7 text-[var(--sn-muted)]">{capability.description}</p>
              </div>
              <ul className="border-t border-[var(--sn-line)]">
                {capability.details.map((detail) => (
                  <li key={detail} className="flex items-center justify-between border-b border-[var(--sn-line)] py-3 text-sm text-[var(--sn-ink)] dark:text-white/80">
                    {detail} <ArrowUpRight className="h-3.5 w-3.5 text-[var(--sn-accent)]" />
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
