import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Globe2, Laptop, Monitor, Smartphone } from 'lucide-react'

const PLATFORMS = [
  { icon: Monitor, name: 'Desktop', systems: 'macOS / Windows / Linux', capability: 'Native vault access and device biometrics' },
  { icon: Smartphone, name: 'Mobile', systems: 'iOS / Android', capability: 'Passkeys and recovery when you are away' },
  { icon: Globe2, name: 'Browser', systems: 'Chrome / Firefox / Safari / Edge', capability: 'Autofill and trusted access workflows' },
  { icon: Laptop, name: 'Web', systems: 'Any modern browser', capability: 'Secure access without a platform install' }
] as const

export const Platforms: React.FC = () => (
  <section className="sn-section border-b border-[var(--sn-line)]">
    <div className="sn-marketing-container grid gap-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
      <div>
        <p className="sn-eyebrow">Available where work happens</p>
        <h2 className="sn-display mt-6">A consistent security boundary on every device.</h2>
        <p className="mt-6 max-w-lg leading-7 text-[var(--sn-muted)]">
          The interface adapts to the platform. The zero-knowledge boundary and recovery model do not.
        </p>
        <Link to="/downloads" className="sn-text-link mt-8 inline-flex items-center gap-2">
          Explore downloads <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="border-t border-[var(--sn-line)]">
        {PLATFORMS.map((platform) => (
          <div key={platform.name} className="grid gap-4 border-b border-[var(--sn-line)] py-7 sm:grid-cols-[48px_0.55fr_0.8fr] sm:items-center">
            <platform.icon className="h-5 w-5 text-[var(--sn-accent)]" />
            <div>
              <h3 className="font-semibold text-[var(--sn-ink)] dark:text-white">{platform.name}</h3>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sn-muted)]">{platform.systems}</p>
            </div>
            <p className="text-sm leading-6 text-[var(--sn-muted)]">{platform.capability}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default Platforms
