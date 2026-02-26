import React from 'react'
import { Fingerprint, ShieldCheck, Smartphone, AlertTriangle } from 'lucide-react'

const features = [
  {
    icon: Fingerprint,
    title: 'Face ID / Touch ID',
    description: 'Biometric unlock on supported web, iOS, Android, and desktop environments.'
  },
  {
    icon: ShieldCheck,
    title: 'Zero-Knowledge Encryption',
    description: 'Vault data is encrypted client-side with AES-256 and hardened key derivation.'
  },
  {
    icon: Smartphone,
    title: 'Cross-Platform Sync',
    description: 'Web, mobile, and desktop experiences share one secure account model.'
  },
  {
    icon: AlertTriangle,
    title: 'Breach Monitoring',
    description: 'Weak, reused, and breached credential detection is built into daily workflows.'
  }
]

const AppFeatureRibbon: React.FC = () => {
  return (
    <section className="mt-8 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-800/50"
        >
          <feature.icon className="w-5 h-5 text-secondary-700 dark:text-secondary-300 mb-2" />
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{feature.title}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{feature.description}</p>
        </article>
      ))}
    </section>
  )
}

export default AppFeatureRibbon
