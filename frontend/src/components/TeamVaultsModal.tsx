import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../ui/Button'
import EntryForm from './EntryForm'
import VaultEntryCard from './VaultEntryCard'
import type { VaultEntry } from '../types/vault'
import {
  createTeam,
  createTeamVault,
  deleteTeamVault,
  getTeam,
  getTeams,
  inviteTeamMember,
  saveTeamVault,
  unlockTeamVault,
  updateTeamMemberRole,
  type TeamDetails,
  type TeamMember,
  type TeamRole,
  type TeamSummary,
  type TeamVaultDocument,
  type TeamVaultEntry,
  type TeamVaultSummary,
  type UnlockedTeamVault
} from '../services/teamService'

interface TeamVaultsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
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

const teamVaultCategories = ['Login', 'Secure Note', 'Credit Card', 'One-Time Code']

const formatDate = (timestamp?: number | null) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleDateString()
}

const formatDateTime = (timestamp?: number | null) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleString()
}

const stripTeamVaultMetadata = (description?: string | null) => {
  if (!description) return null
  const visible = description.replace(/\s*\[vault-salt:[A-Za-z0-9+/=]+\]\s*$/u, '').trim()
  return visible || null
}

const canManageMembers = (team: TeamDetails | TeamSummary | null) => {
  if (!team) return false
  return team.role === 'owner' || team.role === 'admin' || team.permissions.canShare || team.permissions.canEdit
}

const canManageVaults = (team: TeamDetails | TeamSummary | null) => {
  if (!team) return false
  return team.role === 'owner' || team.role === 'admin' || team.permissions.canCreate || team.permissions.canDelete
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
    createdAt: entry.createdAt || Date.now(),
    updatedAt: Date.now()
  }
}

const TeamVaultsModal: React.FC<TeamVaultsModalProps> = ({ isOpen, onClose, currentUserId }) => {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamDetails | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [vaultError, setVaultError] = useState<string | null>(null)
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false)
  const [isMutatingTeam, setIsMutatingTeam] = useState(false)
  const [isUnlockingVault, setIsUnlockingVault] = useState(false)
  const [isSavingVault, setIsSavingVault] = useState(false)

  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('member')
  const [vaultName, setVaultName] = useState('')
  const [vaultDescription, setVaultDescription] = useState('')
  const [vaultPassphrase, setVaultPassphrase] = useState('')
  const [vaultPassphraseConfirm, setVaultPassphraseConfirm] = useState('')

  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null)
  const [unlockPassphrase, setUnlockPassphrase] = useState('')
  const [unlockedVault, setUnlockedVault] = useState<UnlockedTeamVault | null>(null)
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null)

  const selectedSummary = useMemo(
    () => teams.find(team => team.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  )

  const selectedVaultSummary = useMemo(
    () => selectedTeam?.vaults.find(vault => vault.id === selectedVaultId) || null,
    [selectedTeam, selectedVaultId]
  )

  const unlockedEntries = useMemo(
    () => unlockedVault?.document.entries.map(mapTeamEntryToVaultEntry) || [],
    [unlockedVault]
  )

  const applyVaultSummaryUpdate = useCallback((vaultId: string, version: number, updatedAt: number) => {
    setSelectedTeam(prev => {
      if (!prev) return prev
      return {
        ...prev,
        vaults: prev.vaults.map(vault => (
          vault.id === vaultId
            ? { ...vault, version, updatedAt }
            : vault
        ))
      }
    })
  }, [])

  const loadWorkspace = useCallback(async (preferredTeamId?: string | null) => {
    setIsWorkspaceLoading(true)
    setWorkspaceError(null)

    try {
      const { teams: loadedTeams } = await getTeams()
      setTeams(loadedTeams)

      const nextTeamId = preferredTeamId && loadedTeams.some(team => team.id === preferredTeamId)
        ? preferredTeamId
        : loadedTeams[0]?.id || null

      if (!nextTeamId) {
        setSelectedTeamId(null)
        setSelectedTeam(null)
        setSelectedVaultId(null)
        setUnlockedVault(null)
        return
      }

      const detail = await getTeam(nextTeamId)
      setSelectedTeamId(nextTeamId)
      setSelectedTeam(detail)
      setSelectedVaultId(current => detail.vaults.some(vault => vault.id === current) ? current : null)
    } catch (err: any) {
      console.error('Failed to load team workspace:', err)
      setWorkspaceError(err?.message || 'Failed to load team workspace')
      setSelectedTeam(null)
    } finally {
      setIsWorkspaceLoading(false)
    }
  }, [])

  const loadTeamDetail = useCallback(async (teamId: string) => {
    setIsWorkspaceLoading(true)
    setWorkspaceError(null)

    try {
      const detail = await getTeam(teamId)
      setSelectedTeamId(teamId)
      setSelectedTeam(detail)
      setSelectedVaultId(null)
      setUnlockedVault(null)
      setVaultError(null)
      setUnlockPassphrase('')
    } catch (err: any) {
      console.error('Failed to load team details:', err)
      setWorkspaceError(err?.message || 'Failed to load team details')
    } finally {
      setIsWorkspaceLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadWorkspace(selectedTeamId)
    }
  }, [isOpen, loadWorkspace, selectedTeamId])

  const refreshCurrentTeam = useCallback(async () => {
    await loadWorkspace(selectedTeamId)
  }, [loadWorkspace, selectedTeamId])

  const resetVaultComposer = () => {
    setVaultName('')
    setVaultDescription('')
    setVaultPassphrase('')
    setVaultPassphraseConfirm('')
  }

  const handleCreateTeam = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!teamName.trim()) return

    setIsMutatingTeam(true)
    setWorkspaceError(null)

    try {
      const created = await createTeam(teamName.trim(), teamDescription.trim() || undefined)
      setTeamName('')
      setTeamDescription('')
      await loadWorkspace(created.id)
    } catch (err: any) {
      console.error('Failed to create team:', err)
      setWorkspaceError(err?.message || 'Failed to create team')
    } finally {
      setIsMutatingTeam(false)
    }
  }

  const handleCreateVault = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTeamId || !vaultName.trim()) return

    if (vaultPassphrase.length < 12) {
      setVaultError('Use a team-vault passphrase with at least 12 characters.')
      return
    }

    if (vaultPassphrase !== vaultPassphraseConfirm) {
      setVaultError('Team-vault passphrases do not match.')
      return
    }

    setIsMutatingTeam(true)
    setVaultError(null)

    try {
      const createdVault = await createTeamVault(
        selectedTeamId,
        vaultName.trim(),
        vaultPassphrase,
        vaultDescription.trim() || undefined
      )
      resetVaultComposer()
      await loadWorkspace(selectedTeamId)
      setSelectedVaultId(createdVault.id)
      setUnlockPassphrase(vaultPassphrase)
    } catch (err: any) {
      console.error('Failed to create team vault:', err)
      setVaultError(err?.message || 'Failed to create team vault')
    } finally {
      setIsMutatingTeam(false)
    }
  }

  const handleInviteMember = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTeamId || !inviteEmail.trim()) return

    setIsMutatingTeam(true)
    setWorkspaceError(null)

    try {
      await inviteTeamMember(selectedTeamId, {
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole
      })
      setInviteEmail('')
      setInviteName('')
      setInviteRole('member')
      await loadWorkspace(selectedTeamId)
    } catch (err: any) {
      console.error('Failed to invite team member:', err)
      setWorkspaceError(err?.message || 'Failed to invite team member')
    } finally {
      setIsMutatingTeam(false)
    }
  }

  const handleUpdateMemberRole = async (member: TeamMember, role: TeamRole) => {
    if (!selectedTeamId) return
    if (member.userId && member.userId === currentUserId) return

    setIsMutatingTeam(true)
    setWorkspaceError(null)

    try {
      await updateTeamMemberRole(selectedTeamId, member.id, role)
      await loadWorkspace(selectedTeamId)
    } catch (err: any) {
      console.error('Failed to update team member role:', err)
      setWorkspaceError(err?.message || 'Failed to update team member role')
    } finally {
      setIsMutatingTeam(false)
    }
  }

  const handleDeleteVault = async (vaultId: string, vaultNameToDelete: string) => {
    if (!selectedTeamId) return
    if (!window.confirm(`Delete ${vaultNameToDelete}? This cannot be undone.`)) return

    setIsMutatingTeam(true)
    setVaultError(null)

    try {
      await deleteTeamVault(selectedTeamId, vaultId)
      if (selectedVaultId === vaultId) {
        setSelectedVaultId(null)
        setUnlockedVault(null)
      }
      await loadWorkspace(selectedTeamId)
    } catch (err: any) {
      console.error('Failed to delete team vault:', err)
      setVaultError(err?.message || 'Failed to delete team vault')
    } finally {
      setIsMutatingTeam(false)
    }
  }

  const handleSelectTeam = async (teamId: string) => {
    if (teamId === selectedTeamId && selectedTeam) return
    await loadTeamDetail(teamId)
  }

  const handleSelectVault = (vaultId: string) => {
    setSelectedVaultId(vaultId)
    setUnlockedVault(null)
    setVaultError(null)
    setUnlockPassphrase('')
  }

  const handleUnlockVault = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTeam || !selectedVaultSummary || !unlockPassphrase) return

    setIsUnlockingVault(true)
    setVaultError(null)

    try {
      const unlocked = await unlockTeamVault(selectedTeam.id, selectedVaultSummary, unlockPassphrase)
      setUnlockedVault(unlocked)
    } catch (err: any) {
      console.error('Failed to unlock team vault:', err)
      setVaultError(err?.message || 'Failed to unlock team vault')
      setUnlockedVault(null)
    } finally {
      setIsUnlockingVault(false)
    }
  }

  const persistUnlockedVaultDocument = useCallback(async (nextDocument: TeamVaultDocument) => {
    if (!selectedTeam || !unlockedVault) return

    setIsSavingVault(true)
    setVaultError(null)

    try {
      const response = await saveTeamVault(
        selectedTeam.id,
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
      applyVaultSummaryUpdate(unlockedVault.vault.id, response.vault.version, response.vault.updatedAt)
    } catch (err: any) {
      console.error('Failed to save team vault:', err)
      setVaultError(err?.message || 'Failed to save team vault')
      throw err
    } finally {
      setIsSavingVault(false)
    }
  }, [applyVaultSummaryUpdate, selectedTeam, unlockedVault])

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
  }

  const canOpenVault = Boolean(selectedTeam?.permissions.canView)
  const canCreateEntries = Boolean(selectedTeam?.permissions.canCreate)
  const canEditEntries = Boolean(selectedTeam?.permissions.canEdit)
  const canDeleteEntries = Boolean(selectedTeam?.permissions.canDelete)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-vaults-title"
            aria-describedby="team-vaults-description"
          >
            <div
              className="w-full max-w-7xl max-h-[94vh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4">
                <div>
                  <h2 id="team-vaults-title" className="text-xl font-semibold text-slate-900">
                    Team Workspace
                  </h2>
                  <p id="team-vaults-description" className="mt-1 text-sm text-slate-500">
                    Shared teams, encrypted team vaults, membership, and operational access in one workspace.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => void refreshCurrentTeam()} variant="ghost" size="sm" loading={isWorkspaceLoading || isMutatingTeam}>
                    Refresh
                  </Button>
                  <Button onClick={onClose} variant="ghost" size="sm" aria-label="Close team workspace">
                    ✕
                  </Button>
                </div>
              </div>

              <div className="grid max-h-[calc(94vh-73px)] grid-cols-1 gap-4 overflow-y-auto bg-slate-50 p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Teams</h3>
                        <p className="text-sm text-slate-500">{teams.length} total</p>
                      </div>
                      <Button onClick={() => void refreshCurrentTeam()} variant="outline" size="sm" loading={isWorkspaceLoading}>
                        Reload
                      </Button>
                    </div>

                    <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {isWorkspaceLoading && teams.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                          Loading teams...
                        </div>
                      ) : teams.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                          No teams yet. Create one to start collaborating.
                        </div>
                      ) : (
                        teams.map(team => {
                          const isSelected = team.id === selectedTeamId
                          return (
                            <button
                              key={team.id}
                              type="button"
                              onClick={() => void handleSelectTeam(team.id)}
                              className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                                isSelected
                                  ? 'border-secondary-500 bg-secondary-50'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate font-medium text-slate-900">{team.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleBadgeClass[team.role]}`}>
                                      {roleLabel[team.role]}
                                    </span>
                                  </div>
                                  {team.description && (
                                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{team.description}</p>
                                  )}
                                </div>
                                <div className="text-right text-xs text-slate-500">
                                  <p>{team.memberCount} members</p>
                                  <p>{team.vaultCount} vaults</p>
                                </div>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Create Team</h3>
                    <form onSubmit={handleCreateTeam} className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Team name</label>
                        <input
                          type="text"
                          value={teamName}
                          onChange={e => setTeamName(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                          placeholder="Engineering"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                        <textarea
                          value={teamDescription}
                          onChange={e => setTeamDescription(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                          rows={3}
                          placeholder="Shared workspace for releases and ops"
                        />
                      </div>
                      <Button type="submit" variant="primary" className="w-full" loading={isMutatingTeam}>
                        Create Team
                      </Button>
                    </form>
                  </section>
                </aside>

                <main className="space-y-4">
                  {workspaceError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {workspaceError}
                    </div>
                  )}

                  {!selectedSummary && !selectedTeam && !isWorkspaceLoading && (
                    <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
                      <h3 className="text-lg font-semibold text-slate-900">Select a team</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Choose a team from the sidebar to manage members and encrypted shared vaults.
                      </p>
                    </section>
                  )}

                  {selectedTeam && (
                    <motion.section
                      key={selectedTeam.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-4"
                    >
                      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-2xl font-semibold text-slate-900">{selectedTeam.name}</h3>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleBadgeClass[selectedTeam.role]}`}>
                                Your role: {roleLabel[selectedTeam.role]}
                              </span>
                            </div>
                            {selectedTeam.slug && (
                              <p className="mt-1 text-sm text-slate-500">Slug: {selectedTeam.slug}</p>
                            )}
                            {selectedTeam.description && (
                              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{selectedTeam.description}</p>
                            )}
                          </div>
                          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Members</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">{selectedTeam.members.length}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Vaults</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">{selectedTeam.vaults.length}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Created</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">{formatDate(selectedTeam.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-semibold text-slate-900">Members</h4>
                              <p className="text-sm text-slate-500">Invite teammates and update access roles.</p>
                            </div>
                            {canManageMembers(selectedTeam) && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                Manage enabled
                              </span>
                            )}
                          </div>

                          <div className="mt-4 space-y-3">
                            {selectedTeam.members.map(member => {
                              const isSelf = member.userId ? member.userId === currentUserId : false
                              const canEditRole = canManageMembers(selectedTeam) && member.role !== 'owner' && !isSelf
                              return (
                                <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium text-slate-900">{isSelf ? `${member.name} (You)` : member.name}</p>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass[member.role]}`}>
                                          {roleLabel[member.role]}
                                        </span>
                                      </div>
                                      <p className="mt-1 truncate text-sm text-slate-500">{member.email}</p>
                                      {member.joinedAt && (
                                        <p className="mt-1 text-xs text-slate-400">Joined {formatDateTime(member.joinedAt)}</p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {member.role === 'owner' ? (
                                        <span className="text-sm text-slate-500">Owner permissions locked</span>
                                      ) : canEditRole ? (
                                        <select
                                          value={member.role}
                                          onChange={e => void handleUpdateMemberRole(member, e.target.value as TeamRole)}
                                          disabled={isMutatingTeam}
                                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none"
                                        >
                                          <option value="viewer">Viewer</option>
                                          <option value="member">Member</option>
                                          <option value="manager">Manager</option>
                                          <option value="admin">Admin</option>
                                        </select>
                                      ) : (
                                        <span className="text-sm text-slate-500">Role managed by team admins</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {canManageMembers(selectedTeam) && (
                            <form onSubmit={handleInviteMember} className="mt-6 space-y-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                              <div>
                                <h5 className="font-semibold text-slate-900">Invite member</h5>
                                <p className="text-sm text-slate-500">Invite an existing SafeNode user into this shared workspace.</p>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                                  <input
                                    type="text"
                                    value={inviteName}
                                    onChange={e => setInviteName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                    placeholder="Jane Doe"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                                  <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                    placeholder="jane@company.com"
                                    required
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                                <div className="md:flex-1">
                                  <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                                  <select
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value as TeamRole)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none"
                                  >
                                    <option value="viewer">Viewer</option>
                                    <option value="member">Member</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </div>
                                <Button type="submit" variant="primary" loading={isMutatingTeam}>
                                  Invite Member
                                </Button>
                              </div>
                            </form>
                          )}
                        </div>

                        <div className="space-y-4">
                          {vaultError && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                              {vaultError}
                            </div>
                          )}

                          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h4 className="text-lg font-semibold text-slate-900">Shared Vaults</h4>
                                <p className="text-sm text-slate-500">Reusable encrypted vaults for credentials the team owns together.</p>
                              </div>
                              {canManageVaults(selectedTeam) && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                  Manage enabled
                                </span>
                              )}
                            </div>

                            <div className="mt-4 space-y-3">
                              {selectedTeam.vaults.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                                  No shared vaults yet.
                                </div>
                              ) : (
                                selectedTeam.vaults.map(vault => {
                                  const isSelected = vault.id === selectedVaultId
                                  return (
                                    <div
                                      key={vault.id}
                                      className={`rounded-2xl border p-4 transition-colors ${isSelected ? 'border-secondary-400 bg-secondary-50' : 'border-slate-200 bg-slate-50'}`}
                                    >
                                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium text-slate-900">{vault.name}</p>
                                            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                              v{vault.version}
                                            </span>
                                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                              Encrypted shared vault
                                            </span>
                                          </div>
                                          {stripTeamVaultMetadata(vault.description) && (
                                            <p className="mt-1 text-sm text-slate-500">{stripTeamVaultMetadata(vault.description)}</p>
                                          )}
                                          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                              <span className="font-semibold text-slate-700">Created</span>
                                              <p className="mt-1 text-slate-500">{formatDateTime(vault.createdAt)}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                              <span className="font-semibold text-slate-700">Updated</span>
                                              <p className="mt-1 text-slate-500">{formatDateTime(vault.updatedAt ?? vault.createdAt)}</p>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                          {canOpenVault && (
                                            <Button
                                              onClick={() => handleSelectVault(vault.id)}
                                              variant={isSelected ? 'primary' : 'outline'}
                                              size="sm"
                                            >
                                              {isSelected ? 'Selected' : 'Open Vault'}
                                            </Button>
                                          )}
                                          {canManageVaults(selectedTeam) && (
                                            <Button
                                              onClick={() => void handleDeleteVault(vault.id, vault.name)}
                                              variant="danger"
                                              size="sm"
                                              loading={isMutatingTeam}
                                            >
                                              Delete
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </section>

                          {canManageVaults(selectedTeam) && (
                            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                              <h4 className="text-lg font-semibold text-slate-900">Create Shared Vault</h4>
                              <p className="mt-1 text-sm text-slate-500">
                                Create a reusable shared vault with its own stable encryption secret.
                              </p>

                              <form onSubmit={handleCreateVault} className="mt-4 space-y-4">
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">Vault name</label>
                                  <input
                                    type="text"
                                    value={vaultName}
                                    onChange={e => setVaultName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                    placeholder="Shared Credentials"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                                  <textarea
                                    value={vaultDescription}
                                    onChange={e => setVaultDescription(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                    rows={3}
                                    placeholder="Production accounts and shared access tokens"
                                  />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Team vault passphrase</label>
                                    <input
                                      type="password"
                                      value={vaultPassphrase}
                                      onChange={e => setVaultPassphrase(e.target.value)}
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                      placeholder="At least 12 characters"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Confirm passphrase</label>
                                    <input
                                      type="password"
                                      value={vaultPassphraseConfirm}
                                      onChange={e => setVaultPassphraseConfirm(e.target.value)}
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                      placeholder="Repeat passphrase"
                                      required
                                    />
                                  </div>
                                </div>
                                <Button type="submit" variant="primary" className="w-full" loading={isMutatingTeam}>
                                  Create Shared Vault
                                </Button>
                              </form>
                            </section>
                          )}

                          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h4 className="text-lg font-semibold text-slate-900">Shared Vault Access</h4>
                                <p className="text-sm text-slate-500">Unlock, review, and maintain the currently selected shared vault.</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                unlockedVault
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : selectedVaultSummary
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}>
                                {unlockedVault ? 'Unlocked' : selectedVaultSummary ? 'Ready to unlock' : 'No vault selected'}
                              </span>
                            </div>

                            {!selectedVaultSummary ? (
                              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                                Select a vault above to unlock it.
                              </div>
                            ) : unlockedVault ? (
                              <div className="mt-4 space-y-4">
                                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected vault</p>
                                    <p className="font-medium text-slate-900">{unlockedVault.vault.name}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      {unlockedEntries.length} items in this shared vault
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {canCreateEntries && (
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => {
                                          setEditingEntry(null)
                                          setIsEntryFormOpen(true)
                                        }}
                                      >
                                        Add Entry
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setUnlockedVault(null)
                                        setUnlockPassphrase('')
                                      }}
                                    >
                                      Lock Vault
                                    </Button>
                                  </div>
                                </div>

                                {isSavingVault && (
                                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                    Saving encrypted team vault changes...
                                  </div>
                                )}

                                {unlockedEntries.length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                                    This team vault is empty. Add the first shared credential.
                                  </div>
                                ) : (
                                  <div className="grid gap-3 xl:grid-cols-2">
                                    {unlockedEntries.map(entry => (
                                      <VaultEntryCard
                                        key={entry.id}
                                        entry={entry}
                                        onEdit={(nextEntry) => {
                                          if (!canEditEntries) return
                                          setEditingEntry(nextEntry)
                                          setIsEntryFormOpen(true)
                                        }}
                                        onDelete={(nextEntry) => {
                                          if (!canDeleteEntries) return
                                          void handleDeleteEntry(nextEntry)
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <form onSubmit={handleUnlockVault} className="mt-4 space-y-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected vault</p>
                                  <p className="font-medium text-slate-900">{selectedVaultSummary.name}</p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Enter the team-vault passphrase to decrypt the shared entries for this vault.
                                  </p>
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">Team vault passphrase</label>
                                  <input
                                    type="password"
                                    value={unlockPassphrase}
                                    onChange={e => setUnlockPassphrase(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                    placeholder="Enter the shared vault passphrase"
                                    required
                                  />
                                </div>
                                <Button type="submit" variant="primary" className="w-full" loading={isUnlockingVault}>
                                  Unlock Shared Vault
                                </Button>
                              </form>
                            )}
                          </section>
                        </div>
                      </section>
                    </motion.section>
                  )}
                </main>
              </div>
            </div>
          </motion.div>

          <EntryForm
            isOpen={isEntryFormOpen}
            entry={editingEntry}
            onClose={() => {
              setIsEntryFormOpen(false)
              setEditingEntry(null)
            }}
            onSave={(entry) => {
              void handleSaveEntry(entry)
            }}
            categories={teamVaultCategories}
          />
        </>
      )}
    </AnimatePresence>
  )
}

export default TeamVaultsModal
