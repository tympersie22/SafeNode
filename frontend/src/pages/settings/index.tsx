import React from 'react'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  CreditCard,
  Database,
  Fingerprint,
  HardDrive,
  Laptop,
  LifeBuoy,
  Settings2,
  ShieldCheck,
  UserRound
} from 'lucide-react'
import { SecuritySettings } from './Security'
import { DevicesSettings } from './Devices'
import { BillingSettings } from './Billing'
import { PrivacySettings } from './Privacy'
import { DataSettings } from './Data'
import { AdvancedSettings } from './Advanced'
import { AccountSettings } from './Account'
import { ReportsSettings } from './Reports'
import { RecoveryCenterSettings } from './Recovery'

const SETTINGS_SECTIONS = [
  { id: 'security', label: 'Identity', description: 'Passkeys and authentication', icon: Fingerprint, content: <SecuritySettings /> },
  { id: 'recovery', label: 'Recovery', description: 'Continuity and successor access', icon: LifeBuoy, content: <RecoveryCenterSettings /> },
  { id: 'privacy', label: 'Privacy', description: 'Data and visibility controls', icon: ShieldCheck, content: <PrivacySettings /> },
  { id: 'data', label: 'Vault data', description: 'Encrypted data and recovery', icon: Database, content: <DataSettings /> },
  { id: 'devices', label: 'Devices', description: 'Trusted hardware and sessions', icon: Laptop, content: <DevicesSettings /> },
  { id: 'advanced', label: 'Advanced', description: 'Technical preferences', icon: Settings2, content: <AdvancedSettings /> },
  { id: 'reports', label: 'Reports', description: 'Security activity and events', icon: BarChart3, content: <ReportsSettings /> },
  { id: 'account', label: 'Account', description: 'Profile and ownership', icon: UserRound, content: <AccountSettings /> },
  { id: 'billing', label: 'Plan & access', description: 'Subscription and limits', icon: CreditCard, content: <BillingSettings /> }
] as const

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const activeId = React.useMemo(() => {
    const requested = new URLSearchParams(location.search).get('tab')
    return SETTINGS_SECTIONS.some((section) => section.id === requested) ? requested! : 'security'
  }, [location.search])
  const activeSection = SETTINGS_SECTIONS.find((section) => section.id === activeId) || SETTINGS_SECTIONS[0]

  const selectSection = (id: string) => navigate(`/settings?tab=${id}`, { replace: true })

  return (
    <div className="sn-page min-h-screen">
      <header className="border-b border-[var(--sn-line)]">
        <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center bg-[var(--sn-ink-fixed)] text-white">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--sn-ink)] dark:text-white">Safenode controls</p>
              <p className="text-xs text-[var(--sn-muted)]">Identity, recovery, and vault policy</p>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="sn-outline-button">
            <ArrowLeft className="h-4 w-4" /> Back to vault
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:py-14">
        <aside>
          <div className="mb-8">
            <p className="sn-eyebrow">Configuration</p>
            <h1 className="mt-4 font-serif text-4xl font-medium tracking-[-0.04em] text-[var(--sn-ink)] dark:text-white">Settings</h1>
          </div>
          <nav className="grid grid-cols-2 border-t border-[var(--sn-line)] sm:grid-cols-3 lg:grid-cols-1" aria-label="Settings sections">
            {SETTINGS_SECTIONS.map((section) => {
              const active = section.id === activeId
              return (
                <button
                  key={section.id}
                  onClick={() => selectSection(section.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`grid min-h-[74px] grid-cols-[28px_1fr] items-start gap-3 border-b border-[var(--sn-line)] px-2 py-4 text-left transition-colors ${active ? 'bg-[var(--sn-accent-wash)] text-[var(--sn-ink)]' : 'text-[var(--sn-muted)] hover:text-[var(--sn-ink)]'}`}
                >
                  <section.icon className={`mt-0.5 h-4 w-4 ${active ? 'text-[var(--sn-accent)]' : ''}`} />
                  <span>
                    <span className="block text-sm font-semibold">{section.label}</span>
                    <span className="mt-1 hidden text-xs leading-5 text-[var(--sn-muted)] lg:block">{section.description}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <motion.main
          key={activeSection.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0 border-t border-[var(--sn-line)] pt-8"
        >
          <div className="mb-9 border-b border-[var(--sn-line)] pb-7">
            <p className="sn-eyebrow">{activeSection.label}</p>
            <h2 className="mt-4 font-serif text-4xl font-medium tracking-[-0.04em] text-[var(--sn-ink)] dark:text-white">{activeSection.description}</h2>
          </div>
          {activeSection.content}
        </motion.main>
      </div>
    </div>
  )
}
