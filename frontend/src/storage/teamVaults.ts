/**
 * Team Vaults Management
 * Handles team/organization vaults with admin controls
 */

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invitedAt: number;
  joinedAt?: number;
  status: 'pending' | 'active' | 'suspended';
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canViewAuditLogs: boolean;
  };
}

export interface TeamVault {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  organizationName: string;
  createdAt: number;
  createdBy: string;
  members: TeamMember[];
  vaultId: string; // Reference to shared vault storage
  settings: {
    requireMFA: boolean;
    autoLock: number; // minutes
    allowExternalSharing: boolean;
    auditLogRetention: number; // days
  };
  metadata: {
    entryCount: number;
    lastSync: number;
    storageUsed: number; // bytes
  };
}

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  createdAt: number;
  createdBy: string;
  plan: 'free' | 'team' | 'enterprise';
  settings: {
    ssoEnabled: boolean;
    requireMFA: boolean;
    passwordPolicy?: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
  };
  limits: {
    maxMembers: number;
    maxVaults: number;
    maxStorage: number; // bytes
  };
}

const TEAMS_STORAGE_KEY = 'safenode_teams';
const ORGANIZATIONS_STORAGE_KEY = 'safenode_organizations';

class TeamVaultStorage {
  private teams: Map<string, TeamVault> = new Map();
  private organizations: Map<string, Organization> = new Map();

  async init(): Promise<void> {
    // Load teams
    const teamsStored = localStorage.getItem(TEAMS_STORAGE_KEY);
    if (teamsStored) {
      try {
        const teamsArray = JSON.parse(teamsStored) as TeamVault[];
        teamsArray.forEach(team => {
          this.teams.set(team.id, team);
        });
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    }

    // Load organizations
    const orgsStored = localStorage.getItem(ORGANIZATIONS_STORAGE_KEY);
    if (orgsStored) {
      try {
        const orgsArray = JSON.parse(orgsStored) as Organization[];
        orgsArray.forEach(org => {
          this.organizations.set(org.id, org);
        });
      } catch (error) {
        console.error('Failed to load organizations:', error);
      }
    }
  }

  private async saveTeams(): Promise<void> {
    const teamsArray = Array.from(this.teams.values());
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teamsArray));
  }

  private async saveOrganizations(): Promise<void> {
    const orgsArray = Array.from(this.organizations.values());
    localStorage.setItem(ORGANIZATIONS_STORAGE_KEY, JSON.stringify(orgsArray));
  }

  // Organization Management
  async createOrganization(
    name: string,
    createdBy: string,
    domain?: string,
    plan: Organization['plan'] = 'team'
  ): Promise<Organization> {
    const org: Organization = {
      id: `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      domain,
      createdAt: Date.now(),
      createdBy,
      plan,
      settings: {
        ssoEnabled: false,
        requireMFA: false
      },
      limits: {
        maxMembers: plan === 'free' ? 5 : plan === 'team' ? 50 : 1000,
        maxVaults: plan === 'free' ? 3 : plan === 'team' ? 20 : -1, // -1 = unlimited
        maxStorage: plan === 'free' ? 100 * 1024 * 1024 : plan === 'team' ? 10 * 1024 * 1024 * 1024 : -1 // 100MB, 10GB, unlimited
      }
    };

    this.organizations.set(org.id, org);
    await this.saveOrganizations();

    return org;
  }

  async getOrganization(id: string): Promise<Organization | null> {
    return this.organizations.get(id) || null;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const org = this.organizations.get(id);
    if (!org) {
      throw new Error(`Organization ${id} not found`);
    }

    const updated = { ...org, ...updates };
    this.organizations.set(id, updated);
    await this.saveOrganizations();

    return updated;
  }

  // Team Vault Management
  async createTeamVault(
    name: string,
    organizationId: string,
    createdBy: string,
    description?: string
  ): Promise<TeamVault> {
    const org = this.organizations.get(organizationId);
    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    // Check vault limit
    const existingVaults = Array.from(this.teams.values()).filter(
      t => t.organizationId === organizationId
    );
    if (org.limits.maxVaults !== -1 && existingVaults.length >= org.limits.maxVaults) {
      throw new Error(`Organization has reached the maximum number of vaults (${org.limits.maxVaults})`);
    }

    const team: TeamVault = {
      id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      organizationId,
      organizationName: org.name,
      createdAt: Date.now(),
      createdBy,
      members: [
        {
          id: createdBy,
          email: createdBy, // In real app, fetch from user data
          name: 'You',
          role: 'owner',
          invitedAt: Date.now(),
          joinedAt: Date.now(),
          status: 'active',
          permissions: {
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canShare: true,
            canViewAuditLogs: true
          }
        }
      ],
      vaultId: `team-vault-${Date.now()}`,
      settings: {
        requireMFA: org.settings.requireMFA,
        autoLock: 30,
        allowExternalSharing: false,
        auditLogRetention: 90
      },
      metadata: {
        entryCount: 0,
        lastSync: Date.now(),
        storageUsed: 0
      }
    };

    this.teams.set(team.id, team);
    await this.saveTeams();

    return team;
  }

  async getTeamVault(id: string): Promise<TeamVault | null> {
    return this.teams.get(id) || null;
  }

  async getTeamVaultsByOrganization(organizationId: string): Promise<TeamVault[]> {
    return Array.from(this.teams.values()).filter(t => t.organizationId === organizationId);
  }

  async getAllTeamVaults(): Promise<TeamVault[]> {
    return Array.from(this.teams.values());
  }

  async updateTeamVault(id: string, updates: Partial<TeamVault>): Promise<TeamVault> {
    const team = this.teams.get(id);
    if (!team) {
      throw new Error(`Team vault ${id} not found`);
    }

    const updated = { ...team, ...updates };
    this.teams.set(id, updated);
    await this.saveTeams();

    return updated;
  }

  async deleteTeamVault(id: string): Promise<void> {
    this.teams.delete(id);
    await this.saveTeams();
  }

  // Member Management
  async inviteMember(
    teamId: string,
    email: string,
    name: string,
    role: TeamMember['role'],
    invitedBy: string
  ): Promise<TeamMember> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team vault ${teamId} not found`);
    }

    // Check if member already exists
    const existing = team.members.find(m => m.email === email);
    if (existing) {
      throw new Error('Member already exists in this team');
    }

    // Check member limit
    const org = this.organizations.get(team.organizationId);
    if (org && org.limits.maxMembers !== -1 && team.members.length >= org.limits.maxMembers) {
      throw new Error(`Team has reached the maximum number of members (${org.limits.maxMembers})`);
    }

    const member: TeamMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      role,
      invitedAt: Date.now(),
      status: 'pending',
      permissions: this.getPermissionsForRole(role)
    };

    team.members.push(member);
    this.teams.set(teamId, team);
    await this.saveTeams();

    return member;
  }

  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: TeamMember['role'],
    updatedBy: string
  ): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team vault ${teamId} not found`);
    }

    const member = team.members.find(m => m.id === memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    // Prevent removing the last owner
    if (member.role === 'owner' && newRole !== 'owner') {
      const ownerCount = team.members.filter(m => m.role === 'owner').length;
      if (ownerCount === 1) {
        throw new Error('Cannot remove the last owner');
      }
    }

    member.role = newRole;
    member.permissions = this.getPermissionsForRole(newRole);
    
    this.teams.set(teamId, team);
    await this.saveTeams();
  }

  async removeMember(teamId: string, memberId: string, removedBy: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team vault ${teamId} not found`);
    }

    const member = team.members.find(m => m.id === memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    // Prevent removing the last owner
    if (member.role === 'owner') {
      const ownerCount = team.members.filter(m => m.role === 'owner').length;
      if (ownerCount === 1) {
        throw new Error('Cannot remove the last owner');
      }
    }

    team.members = team.members.filter(m => m.id !== memberId);
    this.teams.set(teamId, team);
    await this.saveTeams();
  }

  async acceptInvite(teamId: string, memberId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team vault ${teamId} not found`);
    }

    const member = team.members.find(m => m.id === memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    member.status = 'active';
    member.joinedAt = Date.now();
    
    this.teams.set(teamId, team);
    await this.saveTeams();
  }

  private getPermissionsForRole(role: TeamMember['role']): TeamMember['permissions'] {
    switch (role) {
      case 'owner':
        return {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canViewAuditLogs: true
        };
      case 'admin':
        return {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canViewAuditLogs: true
        };
      case 'member':
        return {
          canCreate: true,
          canEdit: true,
          canDelete: false,
          canShare: false,
          canViewAuditLogs: false
        };
      case 'viewer':
        return {
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canShare: false,
          canViewAuditLogs: false
        };
    }
  }

  async updateTeamMetadata(teamId: string, metadata: Partial<TeamVault['metadata']>): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team vault ${teamId} not found`);
    }

    team.metadata = { ...team.metadata, ...metadata };
    this.teams.set(teamId, team);
    await this.saveTeams();
  }
}

export const teamVaultStorage = new TeamVaultStorage();

