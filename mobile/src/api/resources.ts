import { apiRequest } from './client'

export interface VaultStatus {
  exists?: boolean
  version?: number
  accessMode?: 'passphrase' | 'wrapped_key'
  recoveryKitConfigured?: boolean
  encryptedVault?: string
  iv?: string
  salt?: string
}

export interface TeamSummary {
  id: string
  name: string
  description?: string | null
  role: string
  memberCount: number
  vaultCount: number
}

export interface TeamVaultSummary {
  id: string
  name: string
  description?: string | null
  version: number
  createdAt: number
  updatedAt?: number
}

export interface TeamMemberSummary {
  id: string
  userId?: string
  email: string
  name?: string | null
  role: string
  joinedAt?: number
}

export interface TeamDetails extends TeamSummary {
  members: TeamMemberSummary[]
  vaults: TeamVaultSummary[]
  createdAt: number
}

export interface DeviceSummary {
  id?: string
  deviceId?: string
  name?: string
  platform?: string
  isActive?: boolean
  lastSeenAt?: number | string
}

export interface CurrentUser {
  id: string
  email: string
  displayName?: string | null
  subscriptionTier?: string
  hasVault?: boolean
  recoveryKitConfigured?: boolean
}

export const getCurrentUser = () => apiRequest<CurrentUser>('/api/auth/me')
export const getVaultStatus = () => apiRequest<VaultStatus>('/api/auth/vault/latest')
export const getTeams = () => apiRequest<{ teams: TeamSummary[] }>('/api/teams?page=1&limit=50')
export const getTeam = (teamId: string) => apiRequest<TeamDetails>(`/api/teams/${encodeURIComponent(teamId)}`)
export const getDevices = () => apiRequest<{ devices: DeviceSummary[] }>('/api/devices')
