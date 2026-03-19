import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Button from '../ui/Button'
import {
  createTeam,
  createTeamVault,
  deleteTeamVault,
  getTeam,
  getTeams,
  inviteTeamMember,
  removeTeamMember,
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

interface TeamVaultEntryDraft {
  id?: string
  name: string
  username: string
  password: string
  url: string
  notes: string
  tags: string
  category: TeamVaultEntry['category']
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

const emptyEntryDraft = (): TeamVaultEntryDraft => ({
  name: '',
  username: '',
  password: '',
  url: '',
  notes: '',
  tags: '',
  category: 'password'
})

const formatDate = (timestamp?: number | null) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleDateString()
}

const formatDateTime = (timestamp?: number | null) => {
  if (!timestamp) return 'Unknown'
  return new Date(timestamp).toLocaleString()
}

const canManageMembers = (team: TeamDetails | TeamSummary | null) => {
  if (!team) return false
  return team.role === 'owner' || team.role === 'admin' || team.permissions.canShare || team.permissions.canEdit
}

const canManageVaults = (team: TeamDetails | TeamSummary | null) => {
  if (!team) return false
  return team.role === 'owner' || team.role === 'admin' || team.permissions.canCreate || team.permissions.canDelete
}

const canEditVault = (team: TeamDetails | TeamSummary | null) => {
  if (!team) return false
  return team.permissions.canEdit || team.role === 'owner' || team.role === 'admin' || team.role === 'manager'
}

function normalizeTagString(tags?: string[]) {
  return (tags || []).join(', ')
}

function draftFromEntry(entry: TeamVaultEntry): TeamVaultEntryDraft {
  return {
    id: entry.id,
    name: entry.name,
    username: entry.username || '',
    password: entry.password || '',
    url: entry.url || '',
    notes: entry.notes || '',
    tags: normalizeTagString(entry.tags),
    category: entry.category
  }
}

function entryFromDraft(draft: TeamVaultEntryDraft): TeamVaultEntry {
  const now = Date.now()
  return {
    id: draft.id || `team-entry-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: draft.name.trim(),
    username: draft.username.trim() || undefined,
    password: draft.password || undefined,
    url: draft.url.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    tags: draft.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean),
    category: draft.category,
    createdAt: now,
    updatedAt: now
  }
}

const TeamVaultsModal: React.FC<TeamVaultsModalProps> = ({ isOpen, onClose, currentUserId }) => {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
  const [entryDraft, setEntryDraft] = useState<TeamVaultEntryDraft>(emptyEntryDraft())
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [vaultDirty, setVaultDirty] = useState(false)

  const selectedVault = useMemo(
    () => selectedTeam?.vaults.find(vault => vault.id === selectedVaultId) || null,
    [selectedTeam?.vaults, selectedVaultId]
  )

  const loadWorkspace = useCallback(async (preferredTeamId?: string | null) => {
    setIsLoading(true)
    setError(null)

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

      const nextVaultId = detail.vaults.some(vault => vault.id === selectedVaultId)
        ? selectedVaultId
        : detail.vaults[0]?.id || null
      setSelectedVaultId(nextVaultId)
      setUnlockedVault(prev => (
        prev && nextVaultId && prev.vault.id === nextVaultId && prev.vault.teamId === nextTeamId
          ? prev
          : null
      ))
    } catch (err: any) {
      console.error('Failed to load team workspace:', err)
      setError(err?.message || 'Failed to load team workspace')
      setSelectedTeam(null)
    } finally {
      setIsLoading(false)
    }
  }, [selectedVaultId])

  useEffect(() => {
    if (isOpen) {
      void loadWorkspace(selectedTeamId)
    }
  }, [isOpen, loadWorkspace, selectedTeamId])

  useEffect(() => {
    if (!selectedVaultId) {
      setUnlockedVault(null)
      setUnlockPassphrase('')
      setEditingEntryId(null)
      setEntryDraft(emptyEntryDraft())
      setVaultDirty(false)
      return
    }

    if (unlockedVault && unlockedVault.vault.id !== selectedVaultId) {
      setUnlockedVault(null)
      setUnlockPassphrase('')
      setEditingEntryId(null)
      setEntryDraft(emptyEntryDraft())
      setVaultDirty(false)
    }
  }, [selectedVaultId, unlockedVault])

  const refreshCurrentTeam = useCallback(async () => {
    await loadWorkspace(selectedTeamId)
  }, [loadWorkspace, selectedTeamId])

  const handleCreateTeam = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!teamName.trim()) return

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const created = await createTeam(teamName.trim(), teamDescription.trim() || undefined)
      setTeamName('')
      setTeamDescription('')
      await loadWorkspace(created.id)
      setSuccessMessage(`Created team ${created.name}.`)
    } catch (err: any) {
      console.error('Failed to create team:', err)
      setError(err?.message || 'Failed to create team')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateVault = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTeamId || !vaultName.trim()) return
    if (vaultPassphrase.length < 12) {
      setError('Team vault passphrase must be at least 12 characters.')
      return
    }
    if (vaultPassphrase !== vaultPassphraseConfirm) {
      setError('Team vault passphrases do not match.')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const createdVault = await createTeamVault(
        selectedTeamId,
        vaultName.trim(),
        vaultPassphrase,
        vaultDescription.trim() || undefined
      )
      setVaultName('')
      setVaultDescription('')
      setVaultPassphrase('')
      setVaultPassphraseConfirm('')
      await loadWorkspace(selectedTeamId)
      setSelectedVaultId(createdVault.id)
      setSuccessMessage(`Created team vault ${createdVault.name}.`)
    } catch (err: any) {
      console.error('Failed to create team vault:', err)
      setError(err?.message || 'Failed to create team vault')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteMember = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTeamId || !inviteEmail.trim()) return

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

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
      setSuccessMessage('Team member invited successfully.')
    } catch (err: any) {
      console.error('Failed to invite team member:', err)
      setError(err?.message || 'Failed to invite team member')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateMemberRole = async (member: TeamMember, role: TeamRole) => {
    if (!selectedTeamId) return
    if (member.userId && member.userId === currentUserId) return

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await updateTeamMemberRole(selectedTeamId, member.id, role)
      await loadWorkspace(selectedTeamId)
      setSuccessMessage(`Updated ${member.name}'s role to ${roleLabel[role]}.`)
    } catch (err: any) {
      console.error('Failed to update team member role:', err)
      setError(err?.message || 'Failed to update team member role')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (member: TeamMember) => {
    if (!selectedTeamId) return
    if (!window.confirm(`Remove ${member.name} from this team?`)) return

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await removeTeamMember(selectedTeamId, member.id)
      await loadWorkspace(selectedTeamId)
      setSuccessMessage(`Removed ${member.name} from the team.`)
    } catch (err: any) {
      console.error('Failed to remove team member:', err)
      setError(err?.message || 'Failed to remove team member')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteVault = async (vaultId: string, vaultNameValue: string) => {
    if (!selectedTeamId) return
    if (!window.confirm(`Delete ${vaultNameValue}? This cannot be undone.`)) return

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await deleteTeamVault(selectedTeamId, vaultId)
      if (selectedVaultId === vaultId) {
        setSelectedVaultId(null)
        setUnlockedVault(null)
      }
      await loadWorkspace(selectedTeamId)
      setSuccessMessage(`Deleted ${vaultNameValue}.`)
    } catch (err: any) {
      console.error('Failed to delete team vault:', err)
      setError(err?.message || 'Failed to delete team vault')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlockVault = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTeamId || !selectedVault || !unlockPassphrase) return

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const unlocked = await unlockTeamVault(selectedTeamId, selectedVault, unlockPassphrase)
      setUnlockedVault(unlocked)
      setEntryDraft(emptyEntryDraft())
      setEditingEntryId(null)
      setVaultDirty(false)
      setSuccessMessage(`Unlocked ${selectedVault.name}.`)
    } catch (err: any) {
      console.error('Failed to unlock team vault:', err)
      setError(err?.message || 'Failed to unlock team vault. Check the team vault passphrase and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveVault = async () => {
    if (!selectedTeamId || !unlockedVault) return

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const document: TeamVaultDocument = {
        ...unlockedVault.document,
        updatedAt: Date.now()
      }
      const response = await saveTeamVault(
        selectedTeamId,
        unlockedVault.vault.id,
        unlockedVault.passphrase,
        unlockedVault.salt,
        document,
        unlockedVault.vault.version
      )

      const nextVersion = response.vault.version
      setUnlockedVault(prev => prev ? {
        ...prev,
        vault: {
          ...prev.vault,
          version: nextVersion,
          updatedAt: response.vault.updatedAt
        },
        document: {
          ...prev.document,
          version: nextVersion,
          updatedAt: response.vault.updatedAt
        }
      } : prev)
      setVaultDirty(false)
      await loadWorkspace(selectedTeamId)
      setSuccessMessage('Team vault saved successfully.')
    } catch (err: any) {
      console.error('Failed to save team vault:', err)
      setError(err?.message || 'Failed to save team vault')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectTeam = async (teamId: string) => {
    if (teamId === selectedTeamId && selectedTeam) return
    setSelectedVaultId(null)
    setUnlockedVault(null)
    setUnlockPassphrase('')
    await loadWorkspace(teamId)
  }

  const handleSelectVault = (vaultId: string) => {
    if (vaultDirty && !window.confirm('You have unsaved team vault changes. Discard them?')) {
      return
    }
    setSelectedVaultId(vaultId)
    setUnlockedVault(null)
    setUnlockPassphrase('')
    setEditingEntryId(null)
    setEntryDraft(emptyEntryDraft())
    setVaultDirty(false)
    setError(null)
  }

  const upsertEntry = (event: React.FormEvent) => {
    event.preventDefault()
    if (!unlockedVault || !entryDraft.name.trim()) {
      return
    }

    const nextEntry = entryFromDraft(entryDraft)
    setUnlockedVault(prev => {
      if (!prev) return prev
      const currentEntries = prev.document.entries || []
      const existing = currentEntries.find(entry => entry.id === nextEntry.id)
      const updatedEntry: TeamVaultEntry = existing
        ? {
            ...existing,
            ...nextEntry,
            createdAt: existing.createdAt,
            updatedAt: Date.now()
          }
        : nextEntry
      const nextEntries = existing
        ? currentEntries.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
        : [updatedEntry, ...currentEntries]

      return {
        ...prev,
        document: {
          ...prev.document,
          entries: nextEntries,
          updatedAt: Date.now()
        }
      }
    })
    setVaultDirty(true)
    setEditingEntryId(null)
    setEntryDraft(emptyEntryDraft())
    setSuccessMessage(editingEntryId ? 'Updated team vault entry.' : 'Added team vault entry.')
  }

  const handleEditEntry = (entry: TeamVaultEntry) => {
    setEditingEntryId(entry.id)
    setEntryDraft(draftFromEntry(entry))
  }

  const handleDeleteEntry = (entryId: string) => {
    if (!unlockedVault) return
    setUnlockedVault(prev => {
      if (!prev) return prev
      return {
        ...prev,
        document: {
          ...prev.document,
          entries: prev.document.entries.filter(entry => entry.id !== entryId),
          updatedAt: Date.now()
        }
      }
    })
    setVaultDirty(true)
    if (editingEntryId === entryId) {
      setEditingEntryId(null)
      setEntryDraft(emptyEntryDraft())
    }
  }

  const sortedEntries = useMemo(() => (
    [...(unlockedVault?.document.entries || [])].sort((a, b) => b.updatedAt - a.updatedAt)
  ), [unlockedVault?.document.entries])

  if (!isOpen) return null

  return (
    <AnimatePresence>
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
                Each team vault is a separate encrypted workspace with its own passphrase and entry inventory.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => void refreshCurrentTeam()} variant="ghost" size="sm" loading={isLoading}>
                Refresh
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm" aria-label="Close team workspace">
                ✕
              </Button>
            </div>
          </div>

          <div className="grid max-h-[calc(94vh-73px)] grid-cols-1 gap-4 overflow-y-auto bg-slate-50 p-4 xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Teams</h3>
                    <p className="text-sm text-slate-500">{teams.length} total</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {isLoading && teams.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                      Loading teams...
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                      No teams yet. Create one to start.
                    </div>
                  ) : teams.map(team => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => void handleSelectTeam(team.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                        team.id === selectedTeamId
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
                  ))}
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
                      placeholder="Shared release and incident workspace"
                    />
                  </div>
                  <Button type="submit" variant="primary" className="w-full" loading={isLoading}>
                    Create Team
                  </Button>
                </form>
              </section>
            </aside>

            <main className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              {!selectedTeam && !isLoading && (
                <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Select a team</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Choose a team from the sidebar to manage members and shared vaults.
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
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-2xl font-semibold text-slate-900">{selectedTeam.name}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleBadgeClass[selectedTeam.role]}`}>
                            Your role: {roleLabel[selectedTeam.role]}
                          </span>
                        </div>
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

                  <section className="grid gap-4 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div className="space-y-4">
                      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">Team Members</h4>
                            <p className="text-sm text-slate-500">Manage access to this shared vault workspace.</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {selectedTeam.members.map(member => {
                            const isSelf = member.userId ? member.userId === currentUserId : false
                            const canEditRole = canManageMembers(selectedTeam) && member.role !== 'owner' && !isSelf
                            return (
                              <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

                                  <div className="flex flex-wrap items-center gap-2">
                                    {member.role === 'owner' ? (
                                      <span className="text-sm text-slate-500">Owner permissions locked</span>
                                    ) : canEditRole ? (
                                      <>
                                        <select
                                          value={member.role}
                                          onChange={e => void handleUpdateMemberRole(member, e.target.value as TeamRole)}
                                          disabled={isLoading}
                                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none"
                                        >
                                          <option value="viewer">Viewer</option>
                                          <option value="member">Member</option>
                                          <option value="manager">Manager</option>
                                          <option value="admin">Admin</option>
                                        </select>
                                        <Button
                                          onClick={() => void handleRemoveMember(member)}
                                          variant="outline"
                                          size="sm"
                                          loading={isLoading}
                                        >
                                          Remove
                                        </Button>
                                      </>
                                    ) : (
                                      <span className="text-sm text-slate-500">Role managed by admins</span>
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
                              <p className="text-sm text-slate-500">Members must already have a SafeNode account.</p>
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
                              <Button type="submit" variant="primary" loading={isLoading}>
                                Invite Member
                              </Button>
                            </div>
                          </form>
                        )}
                      </section>

                      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">Team Vaults</h4>
                            <p className="text-sm text-slate-500">Each vault is a separate encrypted workspace.</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {selectedTeam.vaults.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                              No team vaults yet.
                            </div>
                          ) : (
                            selectedTeam.vaults.map(vault => (
                              <button
                                key={vault.id}
                                type="button"
                                onClick={() => handleSelectVault(vault.id)}
                                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                                  vault.id === selectedVaultId
                                    ? 'border-secondary-500 bg-secondary-50'
                                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-slate-900">{vault.name}</p>
                                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                        v{vault.version}
                                      </span>
                                    </div>
                                    {vault.description && (
                                      <p className="mt-1 text-sm text-slate-500">
                                        {vault.description.replace(/\s*\[vault-salt:[A-Za-z0-9+/=]+\]\s*$/u, '')}
                                      </p>
                                    )}
                                    <p className="mt-1 text-xs text-slate-400">
                                      Created {formatDateTime(vault.createdAt)}
                                      {vault.updatedAt ? ` • Updated ${formatDateTime(vault.updatedAt)}` : ''}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {vault.id === selectedVaultId && unlockedVault?.vault.id === vault.id && (
                                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                        Unlocked
                                      </span>
                                    )}
                                    {canManageVaults(selectedTeam) && (
                                      <Button
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          void handleDeleteVault(vault.id, vault.name)
                                        }}
                                        variant="danger"
                                        size="sm"
                                        loading={isLoading}
                                      >
                                        Delete
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </section>

                      {canManageVaults(selectedTeam) && (
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                          <h4 className="text-lg font-semibold text-slate-900">Create Team Vault</h4>
                          <p className="mt-1 text-sm text-slate-500">
                            The team vault passphrase encrypts this workspace separately from personal vaults.
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
                                placeholder="Production accounts and shared tokens"
                              />
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Vault passphrase</label>
                                <input
                                  type="password"
                                  value={vaultPassphrase}
                                  onChange={e => setVaultPassphrase(e.target.value)}
                                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                  placeholder="Minimum 12 characters"
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
                                  placeholder="Repeat the team vault passphrase"
                                  required
                                />
                              </div>
                            </div>
                            <Button type="submit" variant="primary" className="w-full" loading={isLoading}>
                              Create Team Vault
                            </Button>
                          </form>
                        </section>
                      )}
                    </div>

                    <div className="space-y-4">
                      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">Shared Vault Workspace</h4>
                            <p className="text-sm text-slate-500">
                              Open a selected team vault with its dedicated passphrase to manage shared entries.
                            </p>
                          </div>
                          {unlockedVault && (
                            <div className="flex items-center gap-2">
                              {vaultDirty && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  Unsaved changes
                                </span>
                              )}
                              <Button
                                onClick={() => void handleSaveVault()}
                                variant="primary"
                                size="sm"
                                loading={isLoading}
                                disabled={!vaultDirty}
                              >
                                Save Vault
                              </Button>
                            </div>
                          )}
                        </div>

                        {!selectedVault ? (
                          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                            Select a team vault to unlock and edit its shared credentials.
                          </div>
                        ) : !unlockedVault || unlockedVault.vault.id !== selectedVault.id ? (
                          <form onSubmit={handleUnlockVault} className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div>
                              <p className="font-medium text-slate-900">{selectedVault.name}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                Enter the team vault passphrase to decrypt this workspace.
                              </p>
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-slate-700">Team vault passphrase</label>
                              <input
                                type="password"
                                value={unlockPassphrase}
                                onChange={e => setUnlockPassphrase(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                placeholder="Enter the passphrase used when this vault was created"
                                required
                              />
                            </div>
                            <Button type="submit" variant="primary" loading={isLoading}>
                              Unlock Team Vault
                            </Button>
                          </form>
                        ) : (
                          <div className="mt-4 space-y-4">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.72fr)_minmax(320px,0.28fr)]">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                                  <div>
                                    <h5 className="font-semibold text-slate-900">Entries</h5>
                                    <p className="text-sm text-slate-500">{sortedEntries.length} items in this shared vault</p>
                                  </div>
                                </div>

                                <div className="max-h-[520px] overflow-y-auto">
                                  {sortedEntries.length === 0 ? (
                                    <div className="px-4 py-10 text-center text-sm text-slate-500">
                                      This team vault is empty.
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-slate-200">
                                      {sortedEntries.map(entry => (
                                        <div key={entry.id} className="px-4 py-3">
                                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium text-slate-900">{entry.name}</p>
                                                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                                  {entry.category}
                                                </span>
                                              </div>
                                              <div className="mt-1 grid gap-1 text-sm text-slate-500">
                                                {entry.username && <p>Username: {entry.username}</p>}
                                                {entry.url && <p className="truncate">URL: {entry.url}</p>}
                                                {entry.tags && entry.tags.length > 0 && (
                                                  <p>Tags: {entry.tags.join(', ')}</p>
                                                )}
                                                <p className="text-xs text-slate-400">Updated {formatDateTime(entry.updatedAt)}</p>
                                              </div>
                                            </div>

                                            {canEditVault(selectedTeam) && (
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  onClick={() => handleEditEntry(entry)}
                                                  variant="outline"
                                                  size="sm"
                                                >
                                                  Edit
                                                </Button>
                                                <Button
                                                  onClick={() => handleDeleteEntry(entry.id)}
                                                  variant="danger"
                                                  size="sm"
                                                >
                                                  Delete
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div>
                                  <h5 className="font-semibold text-slate-900">
                                    {editingEntryId ? 'Edit shared entry' : 'Add shared entry'}
                                  </h5>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Changes are local to this unlocked team vault until you save.
                                  </p>
                                </div>

                                <form onSubmit={upsertEntry} className="mt-4 space-y-3">
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                                    <input
                                      type="text"
                                      value={entryDraft.name}
                                      onChange={e => setEntryDraft(prev => ({ ...prev, name: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                      placeholder="AWS production root"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                                    <select
                                      value={entryDraft.category}
                                      onChange={e => setEntryDraft(prev => ({ ...prev, category: e.target.value as TeamVaultEntry['category'] }))}
                                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none"
                                    >
                                      <option value="password">Password</option>
                                      <option value="note">Note</option>
                                      <option value="otp">OTP</option>
                                      <option value="credit-card">Credit Card</option>
                                    </select>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                      <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
                                      <input
                                        type="text"
                                        value={entryDraft.username}
                                        onChange={e => setEntryDraft(prev => ({ ...prev, username: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                                      <input
                                        type="text"
                                        value={entryDraft.password}
                                        onChange={e => setEntryDraft(prev => ({ ...prev, password: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">URL</label>
                                    <input
                                      type="url"
                                      value={entryDraft.url}
                                      onChange={e => setEntryDraft(prev => ({ ...prev, url: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                      placeholder="https://console.aws.amazon.com/"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
                                    <input
                                      type="text"
                                      value={entryDraft.tags}
                                      onChange={e => setEntryDraft(prev => ({ ...prev, tags: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                      placeholder="prod, root, shared"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                                    <textarea
                                      value={entryDraft.notes}
                                      onChange={e => setEntryDraft(prev => ({ ...prev, notes: e.target.value }))}
                                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/20"
                                      rows={4}
                                      placeholder="Operational notes for this shared credential"
                                    />
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button type="submit" variant="primary" size="sm">
                                      {editingEntryId ? 'Update Entry' : 'Add Entry'}
                                    </Button>
                                    {(editingEntryId || entryDraft.name || entryDraft.username || entryDraft.password || entryDraft.url || entryDraft.notes || entryDraft.tags) && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingEntryId(null)
                                          setEntryDraft(emptyEntryDraft())
                                        }}
                                      >
                                        Clear
                                      </Button>
                                    )}
                                  </div>
                                </form>
                              </div>
                            </div>
                          </div>
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
    </AnimatePresence>
  )
}

export default TeamVaultsModal
