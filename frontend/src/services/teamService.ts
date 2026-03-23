import { apiDelete, apiGet, apiPost, apiPut } from '../utils/apiClient'
import { arrayBufferToBase64, base64ToArrayBuffer, decrypt, encrypt } from '../crypto/crypto'

export type TeamRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'

export interface TeamPermissions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canViewAuditLogs: boolean
}

export interface TeamSummary {
  id: string
  name: string
  slug?: string
  description?: string | null
  role: TeamRole
  permissions: TeamPermissions
  memberCount: number
  vaultCount: number
  createdAt: number
}

export interface TeamMember {
  id: string
  userId?: string
  email: string
  name: string
  role: TeamRole
  joinedAt?: number
  permissions?: TeamPermissions
}

export interface TeamVaultSummary {
  id: string
  name: string
  description?: string | null
  version: number
  createdAt: number
  updatedAt?: number
}

export interface TeamDetails {
  id: string
  name: string
  slug?: string
  description?: string | null
  role: TeamRole
  permissions: TeamPermissions
  members: TeamMember[]
  vaults: TeamVaultSummary[]
  createdAt: number
}

export interface TeamListResponse {
  teams: TeamSummary[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface TeamVaultEntry {
  id: string
  name: string
  username?: string
  password?: string
  url?: string
  notes?: string
  tags?: string[]
  category: 'password' | 'note' | 'otp' | 'credit-card'
  totpSecret?: string
  attachments?: Array<{
    id: string
    name: string
    size: number
    type: string
    data: string
    createdAt: number
  }>
  breachCount?: number | null
  lastBreachCheck?: number | null
  passwordUpdatedAt?: number | null
  createdAt: number
  updatedAt: number
}

export interface TeamVaultDocument {
  entries: TeamVaultEntry[]
  version: number
  createdAt: number
  updatedAt: number
}

export interface TeamVaultRecord extends TeamVaultSummary {
  teamId: string
  vaultSalt?: string | null
  encryptedVault: string
  iv: string
}

export interface UnlockedTeamVault {
  vault: TeamVaultRecord
  document: TeamVaultDocument
  passphrase: string
  salt: string
}

const DEFAULT_TEAM_VAULT_DOCUMENT: TeamVaultDocument = {
  entries: [],
  version: 1,
  createdAt: Date.now(),
  updatedAt: Date.now()
}

function normalizeTeamVaultDocument(input?: Partial<TeamVaultDocument>): TeamVaultDocument {
  return {
    entries: Array.isArray(input?.entries) ? input!.entries : [],
    version: typeof input?.version === 'number' && input.version > 0 ? input.version : 1,
    createdAt: typeof input?.createdAt === 'number' ? input.createdAt : Date.now(),
    updatedAt: typeof input?.updatedAt === 'number' ? input.updatedAt : Date.now()
  }
}

export async function createEncryptedTeamVaultPayload(
  passphrase: string,
  document: Partial<TeamVaultDocument> = DEFAULT_TEAM_VAULT_DOCUMENT
): Promise<{ encryptedVault: string; iv: string; salt: string }> {
  const payload = normalizeTeamVaultDocument(document)
  const encrypted = await encrypt(JSON.stringify(payload), passphrase)
  return {
    encryptedVault: arrayBufferToBase64(encrypted.encrypted),
    iv: arrayBufferToBase64(encrypted.iv),
    salt: arrayBufferToBase64(encrypted.salt)
  }
}

export async function decryptTeamVaultPayload(
  encryptedVault: string,
  iv: string,
  salt: string,
  passphrase: string
): Promise<TeamVaultDocument> {
  const json = await decrypt({
    encrypted: base64ToArrayBuffer(encryptedVault),
    iv: base64ToArrayBuffer(iv),
    salt: base64ToArrayBuffer(salt)
  }, passphrase)

  const parsed = JSON.parse(json) as Partial<TeamVaultDocument>
  return normalizeTeamVaultDocument(parsed)
}

function parseTeamVaultSalt(description?: string | null): string | null {
  if (!description) return null
  const match = description.match(/\[vault-salt:([A-Za-z0-9+/=]+)\]$/)
  return match?.[1] || null
}

export async function getTeams(page = 1, limit = 50): Promise<TeamListResponse> {
  return apiGet<TeamListResponse>(`/api/teams?page=${page}&limit=${limit}`, {
    requireAuth: true
  })
}

export async function getTeam(teamId: string): Promise<TeamDetails> {
  return apiGet<TeamDetails>(`/api/teams/${teamId}`, {
    requireAuth: true
  })
}

export async function createTeam(name: string, description?: string): Promise<TeamDetails> {
  const response = await apiPost<{ success: boolean; team: TeamDetails }>('/api/teams', {
    name,
    description: description?.trim() || undefined
  }, {
    requireAuth: true
  })

  return response.team
}

export async function createTeamVault(
  teamId: string,
  name: string,
  passphrase: string,
  description?: string
): Promise<TeamVaultSummary> {
  const encrypted = await createEncryptedTeamVaultPayload(passphrase)
  const response = await apiPost<{ success: boolean; vault: TeamVaultSummary }>(`/api/teams/${teamId}/vaults`, {
    name,
    description: description?.trim() || undefined,
    vaultSalt: encrypted.salt,
    encryptedVault: encrypted.encryptedVault,
    iv: encrypted.iv
  }, {
    requireAuth: true
  })

  return response.vault
}

export async function getTeamVault(teamId: string, vaultId: string): Promise<TeamVaultRecord> {
  return apiGet<TeamVaultRecord>(`/api/teams/${teamId}/vaults/${vaultId}`, {
    requireAuth: true
  })
}

export async function unlockTeamVault(teamId: string, vault: TeamVaultSummary, passphrase: string): Promise<UnlockedTeamVault> {
  const record = await getTeamVault(teamId, vault.id)
  const salt = record.vaultSalt || parseTeamVaultSalt(record.description)
  if (!salt) {
    throw new Error('This team vault is missing its vault salt metadata and cannot be unlocked.')
  }

  const document = await decryptTeamVaultPayload(record.encryptedVault, record.iv, salt, passphrase)
  return {
    vault: record,
    document,
    passphrase,
    salt
  }
}

export async function saveTeamVault(
  teamId: string,
  vaultId: string,
  passphrase: string,
  salt: string,
  document: TeamVaultDocument,
  currentVersion: number
): Promise<{ success: boolean; vault: { id: string; version: number; updatedAt: number } }> {
  const normalized = normalizeTeamVaultDocument({
    ...document,
    version: currentVersion + 1,
    updatedAt: Date.now()
  })
  const encrypted = await encrypt(JSON.stringify(normalized), passphrase, base64ToArrayBuffer(salt))

  return apiPut(`/api/teams/${teamId}/vaults/${vaultId}`, {
    encryptedVault: arrayBufferToBase64(encrypted.encrypted),
    iv: arrayBufferToBase64(encrypted.iv),
    version: normalized.version
  }, {
    requireAuth: true
  })
}

export async function inviteTeamMember(
  teamId: string,
  payload: {
    email: string
    name?: string
    role?: TeamRole
  }
): Promise<TeamMember> {
  const response = await apiPost<{ success: boolean; member: TeamMember }>(`/api/teams/${teamId}/members`, {
    email: payload.email,
    name: payload.name?.trim() || undefined,
    role: payload.role || 'member'
  }, {
    requireAuth: true
  })

  return response.member
}

export async function updateTeamMemberRole(
  teamId: string,
  memberId: string,
  role: TeamRole
): Promise<TeamMember> {
  const response = await apiPut<{ success: boolean; member: TeamMember }>(`/api/teams/${teamId}/members/${memberId}`, {
    role
  }, {
    requireAuth: true
  })

  return response.member
}

export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  await apiDelete(`/api/teams/${teamId}/members/${memberId}`, {
    requireAuth: true
  })
}

export async function deleteTeamVault(teamId: string, vaultId: string): Promise<void> {
  await apiDelete(`/api/teams/${teamId}/vaults/${vaultId}`, {
    requireAuth: true
  })
}
