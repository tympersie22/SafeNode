import React, { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import Logo from '../Logo'

interface MarketingHeaderProps {
  onOpenVault?: (mode: 'signup' | 'login') => void
}

const NAV_ITEMS = [
  { label: 'Product', href: '/#features' },
  { label: 'Security', href: '/security' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Downloads', href: '/downloads' },
  { label: 'Journal', href: '/blog' }
] as const

export const MarketingHeader: React.FC<MarketingHeaderProps> = ({ onOpenVault }) => {
  const [isOpen, setIsOpen] = useState(false)
  const reducedMotion = useReducedMotion()

  const vaultAction = (mode: 'signup' | 'login') => {
    setIsOpen(false)
    onOpenVault?.(mode)
  }

  return (
    <header className="sn-marketing-header">
      <div className="sn-marketing-container flex h-[72px] items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3" aria-label="SafeNode home">
          <Logo variant="nav" />
          <span className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--sn-ink)] dark:text-white">SafeNode</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation links">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} to={item.href} className="sn-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {onOpenVault ? (
            <>
              <button className="sn-text-button" onClick={() => vaultAction('login')}>Sign in</button>
              <button className="sn-solid-button" onClick={() => vaultAction('signup')}>
                Create account <ArrowUpRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link className="sn-solid-button" to="/auth">
              Open vault <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center border border-[var(--sn-line)] text-[var(--sn-ink)] lg:hidden dark:text-white"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="border-t border-[var(--sn-line)] bg-[var(--sn-canvas)] lg:hidden dark:bg-[var(--sn-canvas)]"
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <nav className="sn-marketing-container grid py-4" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => (
                <Link key={item.label} to={item.href} onClick={() => setIsOpen(false)} className="border-b border-[var(--sn-line)] py-4 text-lg font-medium text-[var(--sn-ink)] dark:text-white">
                  {item.label}
                </Link>
              ))}
              <div className="flex gap-3 pt-5">
                {onOpenVault ? (
                  <>
                    <button className="sn-outline-button flex-1" onClick={() => vaultAction('login')}>Sign in</button>
                    <button className="sn-solid-button flex-1" onClick={() => vaultAction('signup')}>Create account</button>
                  </>
                ) : (
                  <Link className="sn-solid-button w-full" to="/auth" onClick={() => setIsOpen(false)}>Open vault</Link>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default MarketingHeader
