/**
 * Team Vaults Modal
 * Admin console for managing teams, organizations, and team vaults
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { teamVaultStorage, type TeamVault, type Organization, type TeamMember } from '../storage/teamVaults';
import Button from '../ui/Button';

interface TeamVaultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

const TeamVaultsModal: React.FC<TeamVaultsModalProps> = ({ isOpen, onClose, currentUserId }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teamVaults, setTeamVaults] = useState<TeamVault[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamVault | null>(null);
  const [view, setView] = useState<'organizations' | 'teams' | 'members' | 'create-org' | 'create-team' | 'invite'>('organizations');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [orgName, setOrgName] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [orgPlan, setOrgPlan] = useState<Organization['plan']>('team');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('member');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedOrg) {
      loadTeamVaults(selectedOrg.id);
    }
  }, [selectedOrg]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await teamVaultStorage.init();
      const orgs = await teamVaultStorage.getAllOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0 && !selectedOrg) {
        setSelectedOrg(orgs[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamVaults = async (orgId: string) => {
    try {
      const teams = await teamVaultStorage.getTeamVaultsByOrganization(orgId);
      setTeamVaults(teams);
    } catch (error) {
      console.error('Failed to load team vaults:', error);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const org = await teamVaultStorage.createOrganization(orgName, currentUserId, orgDomain || undefined, orgPlan);
      await loadData();
      setSelectedOrg(org);
      setOrgName('');
      setOrgDomain('');
      setView('organizations');
    } catch (error: any) {
      setError(error.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeamVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !selectedOrg) return;

    setIsLoading(true);
    setError(null);
    try {
      const team = await teamVaultStorage.createTeamVault(
        teamName,
        selectedOrg.id,
        currentUserId,
        teamDescription || undefined
      );
      await loadTeamVaults(selectedOrg.id);
      setSelectedTeam(team);
      setTeamName('');
      setTeamDescription('');
      setView('teams');
    } catch (error: any) {
      setError(error.message || 'Failed to create team vault');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim() || !selectedTeam) return;

    setIsLoading(true);
    setError(null);
    try {
      await teamVaultStorage.inviteMember(
        selectedTeam.id,
        inviteEmail,
        inviteName,
        inviteRole,
        currentUserId
      );
      await loadTeamVaults(selectedTeam.organizationId);
      const updated = await teamVaultStorage.getTeamVault(selectedTeam.id);
      if (updated) setSelectedTeam(updated);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
    } catch (error: any) {
      setError(error.message || 'Failed to invite member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: TeamMember['role']) => {
    if (!selectedTeam) return;

    setIsLoading(true);
    setError(null);
    try {
      await teamVaultStorage.updateMemberRole(selectedTeam.id, memberId, newRole, currentUserId);
      const updated = await teamVaultStorage.getTeamVault(selectedTeam.id);
      if (updated) setSelectedTeam(updated);
    } catch (error: any) {
      setError(error.message || 'Failed to update member role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    setIsLoading(true);
    setError(null);
    try {
      await teamVaultStorage.removeMember(selectedTeam.id, memberId, currentUserId);
      const updated = await teamVaultStorage.getTeamVault(selectedTeam.id);
      if (updated) setSelectedTeam(updated);
    } catch (error: any) {
      setError(error.message || 'Failed to remove member');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: TeamMember['role']): string => {
    switch (role) {
      case 'owner':
        return 'bg-secondary-100 text-secondary-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Team Vaults & Organizations</h2>
            <p className="text-sm text-slate-500 mt-1">Manage teams, organizations, and shared vaults</p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            ✕
          </Button>
        </div>

        {/* Navigation */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex gap-2">
          <button
            onClick={() => setView('organizations')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'organizations'
                ? 'bg-secondary-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Organizations
          </button>
          {selectedOrg && (
            <>
              <button
                onClick={() => setView('teams')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === 'teams'
                    ? 'bg-secondary-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Team Vaults
              </button>
              <button
                onClick={() => setView('create-team')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === 'create-team'
                    ? 'bg-secondary-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                + New Team Vault
              </button>
            </>
          )}
          <button
            onClick={() => setView('create-org')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'create-org'
                ? 'bg-secondary-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            + New Organization
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-secondary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {view === 'organizations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Organizations</h3>
              {organizations.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No organizations found. Create one to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {organizations.map(org => (
                    <div
                      key={org.id}
                      onClick={() => {
                        setSelectedOrg(org);
                        setView('teams');
                      }}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrg?.id === org.id
                          ? 'border-secondary-600 bg-secondary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-slate-900">{org.name}</h4>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                          {org.plan}
                        </span>
                      </div>
                      {org.domain && (
                        <p className="text-sm text-slate-500 mb-2">{org.domain}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        Created {new Date(org.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'teams' && selectedOrg && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Team Vaults - {selectedOrg.name}
                </h3>
              </div>
              {teamVaults.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No team vaults found. Create one to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {teamVaults.map(team => (
                    <div
                      key={team.id}
                      onClick={() => {
                        setSelectedTeam(team);
                        setView('members');
                      }}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTeam?.id === team.id
                          ? 'border-secondary-600 bg-secondary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-slate-900">{team.name}</h4>
                        <span className="text-sm text-slate-500">
                          {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {team.description && (
                        <p className="text-sm text-slate-600 mb-2">{team.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{team.metadata.entryCount || 0} entries</span>
                        <span>•</span>
                        <span>Last sync: {new Date(team.metadata.lastSync).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'members' && selectedTeam && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedTeam.name}</h3>
                  <p className="text-sm text-slate-500">{selectedTeam.description}</p>
                </div>
                <Button
                  onClick={() => {
                    setInviteEmail('');
                    setInviteName('');
                    setInviteRole('member');
                    setView('invite');
                  }}
                  variant="primary"
                  size="sm"
                >
                  + Invite Member
                </Button>
              </div>

              <div className="space-y-2">
                {selectedTeam.members.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{member.name}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                          {member.role}
                        </span>
                        {member.status === 'pending' && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role !== 'owner' && (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as TeamMember['role'])}
                            className="px-2 py-1 border border-slate-300 rounded text-sm"
                            disabled={isLoading}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button
                            onClick={() => handleRemoveMember(member.id)}
                            variant="danger"
                            size="sm"
                            disabled={isLoading}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'create-org' && (
            <form onSubmit={handleCreateOrganization} className="max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Create Organization</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Domain (optional)
                </label>
                <input
                  type="text"
                  value={orgDomain}
                  onChange={(e) => setOrgDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Plan
                </label>
                <select
                  value={orgPlan}
                  onChange={(e) => setOrgPlan(e.target.value as Organization['plan'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="free">Free</option>
                  <option value="team">Team</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={isLoading} className="flex-1">
                  Create Organization
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setView('organizations');
                    setOrgName('');
                    setOrgDomain('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {view === 'create-team' && selectedOrg && (
            <form onSubmit={handleCreateTeamVault} className="max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Create Team Vault</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Team Vault Name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={isLoading} className="flex-1">
                  Create Team Vault
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setView('teams');
                    setTeamName('');
                    setTeamDescription('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {view === 'invite' && selectedTeam && (
            <form onSubmit={handleInviteMember} className="max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Invite Member</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={isLoading} className="flex-1">
                  Send Invite
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setView('members');
                    setInviteEmail('');
                    setInviteName('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TeamVaultsModal;

