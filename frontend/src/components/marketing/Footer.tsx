import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../Logo'

const FOOTER_GROUPS = [
  {
    title: 'Product',
    links: [
      ['Capabilities', '/#features'],
      ['Pricing', '/pricing'],
      ['Downloads', '/downloads'],
      ['Security model', '/security']
    ]
  },
  {
    title: 'Resources',
    links: [
      ['Getting started', '/docs/getting-started'],
      ['Team vaults', '/docs/teams'],
      ['Journal', '/blog'],
      ['Contact', '/contact']
    ]
  },
  {
    title: 'Company',
    links: [
      ['Careers', '/careers'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
      ['Refunds', '/refunds']
    ]
  }
] as const

export const Footer: React.FC = () => (
  <footer className="bg-[var(--sn-ink)] px-5 pb-10 text-white sm:px-8 lg:px-12">
    <div className="mx-auto max-w-[1440px] border-t border-white/15 pt-12">
      <div className="grid gap-12 pb-16 lg:grid-cols-[1.2fr_1.8fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-3" aria-label="Safenode home">
            <Logo variant="nav" />
            <span className="text-xl font-semibold tracking-[-0.03em]">Safenode</span>
          </Link>
          <p className="mt-5 max-w-sm leading-7 text-white/50">
            Passkey-first identity, zero-knowledge secrets, and deliberate recovery for people and teams.
          </p>
          <div className="mt-7 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sn-accent-soft)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--sn-accent-soft)]" /> System operational
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">{group.title}</h2>
              <ul className="mt-5 space-y-3">
                {group.links.map(([label, href]) => (
                  <li key={label}><Link to={href} className="text-sm text-white/65 transition-colors hover:text-white">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-white/15 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Safenode. Zero-knowledge by design.</p>
        <p className="font-mono uppercase tracking-[0.16em]">Identity / Recovery / Team secrets</p>
      </div>
    </div>
  </footer>
)

export default Footer
