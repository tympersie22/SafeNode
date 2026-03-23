import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Copy,
  FolderKanban,
  Globe,
  KeyRound,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Tags,
  Users
} from 'lucide-react'
import { DashboardLayout } from '../../layout/DashboardLayout'
import type { SidebarItem } from '../../ui/SaasSidebar'
import Button from '../ui/Button'
import EntryForm from '../EntryForm'
import PasswordGeneratorModal from '../PasswordGeneratorModal'
import type { VaultEntry } from '../../types/vault'
import {
  getTeam,
  saveTeamVault,
  unlockTeamVault,
  type TeamDetails,
  type TeamRole,
  type TeamVaultDocument,
  type TeamVaultEntry,
  type TeamVaultSummary,
  type UnlockedTeamVault
} from '../../services/teamService'
import { enhancedCopyToClipboard } from '../../desktop/integration'
import { showToast } from '../ui/Toast'

interface TeamVaultWorkspaceProps {
  currentUserId: string
  userName: string
  userEmail: string
  userPlan: string
  passkeySupported: boolean
  onBackToPersonalVault: () => void
  onOpenTeamCenter: () => void
  onOpenBilling: () => void
  onLockPersonalVault: () => void
}

const roleLabel: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer'
}

const roleBadgeClass: Record<TeamRole, string> = {
  owner: 'bg-secondary-100 text-secondary-800',
  admin: 'bg-blue-100 text-blue-800',
  manager: 'bg-amber-100 text-amber-800',
  member: 'bg-green-100 text-green-800',
  viewer: 'bg-slate-100 text-slate-700'
}

const fieldClass =
  'w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20'

const formatDate = (timestamp?: number | null) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleDateString()
}

const formatDateTime = (timestamp?: number | null) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleString()
}

const formatRelative = (timestamp?: number | null) => {
  if (!timestamp) return 'No recent update'
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes}m ago`
  if (hours < 24) return `Updated ${hours}h ago`
  if (days < 7) return `Updated ${days}d ago`
  return `Updated ${new Date(timestamp).toLocaleDateString()}`
}

const formatDomain = (url?: string) => {
  if (!url) return 'No domain'
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const mapTeamEntryToVaultEntry = (entry: TeamVaultEntry): VaultEntry => ({
  id: entry.id,
  name: entry.name,
  username: entry.username || '',
  password: entry.password || '',
  url: entry.url || '',
  notes: entry.notes || '',
  tags: entry.tags || [],
  category:
    entry.category === 'note'
      ? 'Secure Note'
      : entry.category === 'credit-card'
        ? 'Credit Card'
        : entry.category === 'otp'
          ? 'One-Time Code'
          : 'Login',
  totpSecret: entry.totpSecret,
  attachments: entry.attachments || [],
  breachCount: entry.breachCount ?? null,
  lastBreachCheck: entry.lastBreachCheck ?? null,
  passwordUpdatedAt: entry.passwordUpdatedAt ?? null,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt
})

const mapVaultEntryToTeamEntry = (entry: VaultEntry): TeamVaultEntry => {
  const normalizedCategory = (() => {
    switch ((entry.category || '').toLowerCase()) {
      case 'secure note':
      case 'note':
        return 'note'
      case 'credit card':
      case 'credit-card':
        return 'credit-card'
      case 'one-time code':
      case 'otp':
        return 'otp'
      default:
        return 'password'
    }
  })()

  return {
    id: entry.id,
    name: entry.name,
    username: entry.username || undefined,
    password: entry.password || undefined,
    url: entry.url || undefined,
    notes: entry.notes || undefined,
    tags: entry.tags || [],
    category: normalizedCategory,
    totpSecret: entry.totpSecret || undefined,
    attachments: entry.attachments || [],
    breachCount: entry.breachCount ?? null,
    lastBreachCheck: entry.lastBreachCheck ?? null,
    passwordUpdatedAt: entry.passwordUpdatedAt ?? null,
    createdAt: entry.createdAt || Date.now(),
    updatedAt: Date.now()
  }
}

const categoryOptions = ['Login', 'Secure Note', 'Credit Card', 'One-Time Code']

export const TeamVaultWorkspace: React.FC<TeamVaultWorkspaceProps> = ({
  currentUserId,
  userName,
  userEmail,
  userPlan,
  passkeySupported,
  onBackToPersonalVault,
  onOpenTeamCenter,
  onOpenBilling,
  onLockPersonalVault
}) => {
  const navigate = useNavigate()
  const params = useParams<{ teamId: string; vaultId: string }>()
  const teamId = params.teamId || ''
  const vaultId = params.vaultId || ''

  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [vaultError, setVaultError] = useState<string | null>(null)
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true)
  const [isUnlockingVault, setIsUnlockingVault] = useState(false)
  const [isSavingVault, setIsSavingVault] = useState(false)
  const [unlockPassphrase, setUnlockPassphrase] = useState('')
  const [unlockedVault, setUnlockedVault] = useState<UnlockedTeamVault | null>(null)
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showAllTags, setShowAllTags] = useState(false)
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null)
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false)

  const selectedVaultSummary = useMemo(
    () => team?.vaults.find(vault => vault.id === vaultId) || null,
    [team, vaultId]
  )

  const canCreateEntries = Boolean(team?.permissions.canCreate)
  const canEditEntries = Boolean(team?.permissions.canEdit)
  const canDeleteEntries = Boolean(team?.permissions.canDelete)
  const canViewVault = Boolean(team?.permissions.canView)

  const entries = useMemo(
    () => unlockedVault?.document.entries.map(mapTeamEntryToVaultEntry) || [],
    [unlockedVault]
  )

  const filteredEntries = useMemo(() => (
    entries.filter(entry => {
      const matchesQuery = !query.trim() ||
        entry.name.toLowerCase().includes(query.toLowerCase()) ||
        entry.username.toLowerCase().includes(query.toLowerCase()) ||
        (entry.url?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
        (entry.notes?.toLowerCase().includes(query.toLowerCase()) ?? false)

      const matchesTag = !activeTag || (entry.tags?.includes(activeTag) ?? false)
      return matchesQuery && matchesTag
    })
  ), [entries, query, activeTag])

  const tagUsage = useMemo(() => (
    entries.reduce<Record<string, number>>((acc, entry) => {
      ;(entry.tags || []).forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1
      })
      return acc
    }, {})
  ), [entries])

  const allTags = useMemo(
    () => Object.keys(tagUsage).sort((a, b) => tagUsage[b] - tagUsage[a]),
    [tagUsage]
  )

  const topTags = allTags.slice(0, 8)

  const loadTeam = useCallback(async () => {
    if (!teamId) return
    setIsWorkspaceLoading(true)
    setWorkspaceError(null)

    try {
      const nextTeam = await getTeam(teamId)
      setTeam(nextTeam)
    } catch (error: any) {
      console.error('Failed to load team workspace:', error)
      setWorkspaceError(error?.message || 'Failed to load team workspace')
      setTeam(null)
    } finally {
      setIsWorkspaceLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void loadTeam()
  }, [loadTeam])

  useEffect(() => {
    setUnlockedVault(null)
    setUnlockPassphrase('')
    setVaultError(null)
    setQuery('')
    setActiveTag(null)
    setEditingEntry(null)
    setIsEntryFormOpen(false)
  }, [teamId, vaultId])

  const persistUnlockedVaultDocument = useCallback(async (nextDocument: TeamVaultDocument) => {
    if (!team || !unlockedVault) return

    setIsSavingVault(true)
    setVaultError(null)

    try {
      const response = await saveTeamVault(
        team.id,
        unlockedVault.vault.id,
        unlockedVault.passphrase,
        unlockedVault.salt,
        nextDocument,
        unlockedVault.document.version
      )

      const updatedDocument: TeamVaultDocument = {
        ...nextDocument,
        version: response.vault.version,
        updatedAt: response.vault.updatedAt
      }

      setUnlockedVault(prev => prev ? {
        ...prev,
        document: updatedDocument,
        vault: {
          ...prev.vault,
          version: response.vault.version,
          updatedAt: response.vault.updatedAt
        }
      } : prev)

      setTeam(prev => {
        if (!prev) return prev
        return {
          ...prev,
          vaults: prev.vaults.map(vault => (
            vault.id === unlockedVault.vault.id
              ? { ...vault, version: response.vault.version, updatedAt: response.vault.updatedAt }
              : vault
          ))
        }
      })
    } catch (error: any) {
      console.error('Failed to save team vault:', error)
      setVaultError(error?.message || 'Failed to save team vault')
      throw error
    } finally {
      setIsSavingVault(false)
    }
  }, [team, unlockedVault])

  const handleUnlockVault = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!team || !selectedVaultSummary || !unlockPassphrase) return

    setIsUnlockingVault(true)
    setVaultError(null)

    try {
      const unlocked = await unlockTeamVault(team.id, selectedVaultSummary, unlockPassphrase)
      setUnlockedVault(unlocked)
      showToast.success(`${selectedVaultSummary.name} unlocked`)
    } catch (error: any) {
      console.error('Failed to unlock team vault:', error)
      setVaultError(error?.message || 'Failed to unlock team vault')
      setUnlockedVault(null)
    } finally {
      setIsUnlockingVault(false)
    }
  }

  const handleSaveEntry = async (entry: VaultEntry) => {
    if (!unlockedVault) return

    const teamEntry = mapVaultEntryToTeamEntry(entry)
    const existingIndex = unlockedVault.document.entries.findIndex(current => current.id === teamEntry.id)
    const nextEntries = [...unlockedVault.document.entries]

    if (existingIndex >= 0) {
      nextEntries[existingIndex] = teamEntry
    } else {
      nextEntries.unshift(teamEntry)
    }

    const nextDocument: TeamVaultDocument = {
      ...unlockedVault.document,
      entries: nextEntries,
      updatedAt: Date.now()
    }

    await persistUnlockedVaultDocument(nextDocument)
    setIsEntryFormOpen(false)
    setEditingEntry(null)
    showToast.success(existingIndex >= 0 ? 'Shared entry updated' : 'Shared entry added')
  }

  const handleDeleteEntry = async (entry: VaultEntry) => {
    if (!unlockedVault) return
    if (!window.confirm(`Delete ${entry.name}? This cannot be undone.`)) return

    const nextDocument: TeamVaultDocument = {
      ...unlockedVault.document,
      entries: unlockedVault.document.entries.filter(current => current.id !== entry.id),
      updatedAt: Date.now()
    }

    await persistUnlockedVaultDocument(nextDocument)
    showToast.success(`${entry.name} deleted`)
  }

  const sidebarItems: SidebarItem[] = [
    {
      id: 'vault',
      label: 'Personal Vault',
      description: 'Return to your personal workspace',
      section: 'Operations',
      icon: <span>⌘</span>,
      onClick: onBackToPersonalVault
    },
    {
      id: 'team-vault',
      label: 'Team Vault',
      description: 'Shared encrypted team workspace',
      section: 'Workspace',
      icon: <span>◫</span>,
      active: true,
      onClick: () => navigate(`/vault/team/${teamId}/${vaultId}`)
    },
    {
      id: 'team-center',
      label: 'Team Center',
      description: 'Members, roles, and vault management',
      section: 'Workspace',
      icon: <span>◪</span>,
      onClick: onOpenTeamCenter
    },
    {
      id: 'billing',
      label: 'Billing',
      description: 'Plan limits and team subscription',
      section: 'Workspace',
      icon: <span>◔</span>,
      onClick: onOpenBilling
    }
  ]

  const renderLockedState = () => {
    if (!team || !selectedVaultSummary) {
      return (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Shared vault unavailable</h2>
          <p className="mt-2 text-sm text-slate-500">
            This team or vault could not be found. Return to Team Center and select a valid vault.
          </p>
          <div className="mt-6 flex justify-center">
            <Button onClick={onOpenTeamCenter} variant="primary">Back to Team Center</Button>
          </div>
        </section>
      )
    }

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <section className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,_rgba(247,250,245,1)_0%,_rgba(241,247,239,1)_48%,_rgba(255,255,255,1)_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,_rgba(5,15,10,1)_0%,_rgba(8,25,17,1)_48%,_rgba(15,23,42,1)_100%)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Team vault lock
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{selectedVaultSummary.name}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            This shared vault is opened on its own workspace. Access is separated from the personal vault and requires the correct team-vault passphrase before entries are decrypted.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Team</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{team.name}</p>
              <p className="mt-1 text-xs text-slate-500">{team.members.length} members</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Role</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{roleLabel[team.role]}</p>
              <p className="mt-1 text-xs text-slate-500">Current operator access</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Version</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">v{selectedVaultSummary.version}</p>
              <p className="mt-1 text-xs text-slate-500">Updated {formatDate(selectedVaultSummary.updatedAt ?? selectedVaultSummary.createdAt)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/85">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Unlock</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Open shared workspace</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleBadgeClass[team.role]}`}>
              {roleLabel[team.role]}
            </span>
          </div>

          <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Selected vault</p>
            <p className="mt-1 text-sm text-slate-600">{selectedVaultSummary.name}</p>
            <p className="mt-3 text-xs text-slate-500">Created {formatDateTime(selectedVaultSummary.createdAt)}</p>
          </div>

          {!canViewVault ? (
            <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your role cannot view this vault.
            </div>
          ) : (
            <form onSubmit={handleUnlockVault} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Team vault passphrase</label>
                <input
                  type="password"
                  value={unlockPassphrase}
                  onChange={(event) => setUnlockPassphrase(event.target.value)}
                  className={fieldClass}
                  placeholder="Enter the shared vault passphrase"
                  required
                />
              </div>
              {vaultError && (
                <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {vaultError}
                </div>
              )}
              <Button type="submit" variant="primary" className="w-full" loading={isUnlockingVault}>
                Unlock Shared Vault
              </Button>
            </form>
          )}
        </section>
      </div>
    )
  }

  return (
    <>
      <DashboardLayout
        sidebarItems={sidebarItems}
        activeSidebarItem="team-vault"
        sidebarBrand={{
          title: 'SafeNode',
          subtitle: 'Encrypted operations center',
          badge: 'Zero-knowledge'
        }}
        sidebarFooter={{
          title: userName,
          subtitle: userEmail,
          meta: <span className="capitalize">{userPlan}</span>,
          avatar: <span className="text-sm font-semibold">{userName.slice(0, 2).toUpperCase()}</span>,
          details: (
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <p className="capitalize">Plan: {userPlan}</p>
              <p>{passkeySupported ? 'Passkeys supported on this device' : 'Passkeys unavailable on this device'}</p>
              <p>{team ? `Team role: ${roleLabel[team.role]}` : 'Team role unavailable'}</p>
            </div>
          ),
          menuItems: [
            { label: 'Back to personal vault', onClick: onBackToPersonalVault },
            { label: 'Team center', onClick: onOpenTeamCenter },
            { label: 'Billing', onClick: onOpenBilling },
            { label: 'Lock personal vault', onClick: onLockPersonalVault, destructive: true }
          ]
        }}
        topbarTitle={selectedVaultSummary?.name || 'Team Vault'}
        topbarSubtitle={team ? `${team.name} • shared workspace` : 'Shared workspace'}
        topbarSearch={unlockedVault ? {
          placeholder: 'Search shared vault...',
          value: query,
          onChange: setQuery
        } : undefined}
        topbarLeftContent={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onBackToPersonalVault} variant="outline" size="sm" className="min-h-[42px] rounded-xl px-3">
              <ArrowLeft className="h-4 w-4" />
              Personal Vault
            </Button>
            {team && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-900">{team.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass[team.role]}`}>
                  {roleLabel[team.role]}
                </span>
              </div>
            )}
          </div>
        }
        topbarRightContent={
          <div className="flex items-center gap-2">
            {unlockedVault && canCreateEntries && (
              <Button onClick={() => {
                setEditingEntry(null)
                setIsEntryFormOpen(true)
              }} size="sm" variant="primary">
                + Add
              </Button>
            )}
            {unlockedVault && (
              <Button onClick={() => setIsPasswordGeneratorOpen(true)} size="sm" variant="outline">
                Generate
              </Button>
            )}
            <Button onClick={onOpenTeamCenter} size="sm" variant="outline">
              Team Center
            </Button>
            <Button onClick={() => {
              setUnlockedVault(null)
              setUnlockPassphrase('')
              setVaultError(null)
            }} size="sm" variant="ghost">
              Lock Team Vault
            </Button>
          </div>
        }
      >
        {isWorkspaceLoading ? (
          <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Loading team vault</h2>
            <p className="mt-2 text-sm text-slate-500">Fetching team membership, vault metadata, and access permissions.</p>
          </section>
        ) : workspaceError ? (
          <section className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-6 text-red-700 shadow-sm">
            <h2 className="text-xl font-semibold">Workspace unavailable</h2>
            <p className="mt-2 text-sm">{workspaceError}</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void loadTeam()} variant="outline">Retry</Button>
              <Button onClick={onOpenTeamCenter} variant="primary">Back to Team Center</Button>
            </div>
          </section>
        ) : !unlockedVault ? renderLockedState() : (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,_rgba(247,250,245,1)_0%,_rgba(241,247,239,1)_48%,_rgba(255,255,255,1)_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Team vault workspace
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                    {unlockedVault.vault.name}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                    Dedicated encrypted workspace for credentials the team owns together. Data is decrypted only in this session after the correct team-vault passphrase is provided.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Entries</span>
                    <Layers3 className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{entries.length}</p>
                  <p className="mt-1 text-xs text-slate-500">{filteredEntries.length} in current view</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Members</span>
                    <Users className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{team?.members.length || 0}</p>
                  <p className="mt-1 text-xs text-slate-500">{team ? roleLabel[team.role] : 'Role unavailable'}</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tags</span>
                    <Tags className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{allTags.length}</p>
                  <p className="mt-1 text-xs text-slate-500">{showAllTags ? 'Expanded tag map' : 'Active tag routing'}</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Version</span>
                    <Globe className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">v{unlockedVault.document.version}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatRelative(unlockedVault.document.updatedAt)}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Shared inventory</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">Team-owned credentials</h3>
                  <p className="mt-1 text-sm text-slate-500">Shared entries are isolated from the personal vault and saved back to the team vault document only.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTag(null)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTag === null ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                  >
                    All entries
                  </button>
                  {(showAllTags ? allTags : topTags).map(tag => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(tag)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTag === tag ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                    >
                      {tag} <span className="opacity-70">({tagUsage[tag]})</span>
                    </button>
                  ))}
                  {allTags.length > 8 && (
                    <button
                      onClick={() => setShowAllTags(prev => !prev)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
                    >
                      {showAllTags ? 'Collapse tags' : 'Show all tags'}
                    </button>
                  )}
                </div>
              </div>

              {vaultError && (
                <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {vaultError}
                </div>
              )}

              {isSavingVault && (
                <div className="mt-4 rounded-[18px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Saving encrypted team vault changes...
                </div>
              )}

              {filteredEntries.length === 0 ? (
                <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 p-8 text-center">
                  <p className="text-lg font-semibold text-slate-900">No entries in this shared vault view</p>
                  <p className="mt-2 text-sm text-slate-500">Adjust your search or tag filter, or add a shared credential.</p>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 xl:grid-cols-2">
                  {filteredEntries.map(entry => (
                    <div key={entry.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                              {entry.category || 'Login'}
                            </span>
                            {entry.breachCount && entry.breachCount > 0 ? (
                              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                                Breached
                              </span>
                            ) : null}
                            {entry.totpSecret ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                2FA
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 break-words text-lg font-semibold text-slate-950">{entry.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                            <span className="break-all">{entry.username || 'No username stored'}</span>
                            <span>{formatDomain(entry.url)}</span>
                            <span>{formatRelative(entry.updatedAt)}</span>
                          </div>
                          {entry.notes ? (
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{entry.notes}</p>
                          ) : null}
                          {(entry.tags || []).length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {(entry.tags || []).map(tag => (
                                <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {entry.password ? (
                            <Button onClick={() => {
                              enhancedCopyToClipboard(entry.password)
                              showToast.success(`Password copied for ${entry.name}`)
                            }} variant="ghost" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canEditEntries && (
                            <Button onClick={() => {
                              setEditingEntry(entry)
                              setIsEntryFormOpen(true)
                            }} variant="outline" size="sm">
                              Edit
                            </Button>
                          )}
                          {canDeleteEntries && (
                            <Button onClick={() => void handleDeleteEntry(entry)} variant="danger" size="sm">
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Team access</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Authorized members</h3>
                <div className="mt-5 space-y-3">
                  {(team?.members || []).map(member => {
                    const isSelf = member.userId ? member.userId === currentUserId : false
                    return (
                      <div key={member.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 break-words font-medium text-slate-900">{isSelf ? `${member.name} (You)` : member.name}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass[member.role]}`}>
                            {roleLabel[member.role]}
                          </span>
                        </div>
                        <p className="mt-1 break-all text-sm text-slate-500">{member.email}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Vault metadata</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Operational profile</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Created</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(selectedVaultSummary?.createdAt)}</p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Updated</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(selectedVaultSummary?.updatedAt ?? selectedVaultSummary?.createdAt)}</p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Permissions</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {canCreateEntries ? 'Create' : 'Read only'} • {canEditEntries ? 'Edit' : 'No edit'} • {canDeleteEntries ? 'Delete' : 'No delete'}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">Dedicated route, isolated unlock state</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </DashboardLayout>

      <EntryForm
        entry={editingEntry}
        isOpen={isEntryFormOpen}
        onClose={() => {
          setIsEntryFormOpen(false)
          setEditingEntry(null)
        }}
        onSave={handleSaveEntry}
        categories={categoryOptions}
      />

      <PasswordGeneratorModal
        isOpen={isPasswordGeneratorOpen}
        onClose={() => setIsPasswordGeneratorOpen(false)}
        onUsePassword={(password) => {
          setIsPasswordGeneratorOpen(false)
          setEditingEntry(prev => prev ? { ...prev, password } : prev)
        }}
      />
    </>
  )
}

export default TeamVaultWorkspace
