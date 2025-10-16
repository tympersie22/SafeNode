import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import UnlockVault from './components/UnlockVault';
import EntryForm from './components/EntryForm';
import { generateTotpCode, encrypt, arrayBufferToBase64, base64ToArrayBuffer, getPasswordBreachCount } from './crypto/crypto';
import { vaultStorage } from './storage/vaultStorage';
import { vaultSync } from './sync/vaultSync';
import { enhancedCopyToClipboard, isTauri, DesktopVault } from './desktop/integration';
import KeyRotation from './components/KeyRotation';
import SecurityAdvisor from './components/SecurityAdvisor';
import SharingKeys from './components/SharingKeys';
import ShareEntryModal from './components/ShareEntryModal';
import ImportSharedModal from './components/ImportSharedModal';
import Button from './components/ui/Button';
import { LockIcon, SearchIcon } from './components/icons';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import { syncManager, SyncStatus } from './sync/syncManager';
import { backupManager } from './sync/backupManager';
import type { VaultBackup } from './storage/backupStorage';
import type { VaultEntry, VaultAttachment } from './types/vault';
import { evaluatePasswordHealth, type PasswordHealthSummary } from './health/passwordHealth';
import PasskeysModal from './components/PasskeysModal';
import WatchtowerModal, { WatchtowerBanner, watchtowerIssueKey } from './components/WatchtowerModal';

interface VaultData {
  entries: VaultEntry[];
}

const App: React.FC = () => {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isKeyRotationOpen, setIsKeyRotationOpen] = useState(false);
  const [isSharingKeysOpen, setIsSharingKeysOpen] = useState(false);
  const [shareEntry, setShareEntry] = useState<VaultEntry | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'landing' | 'auth' | 'vault'>('landing');
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [syncState, setSyncState] = useState<{ status: SyncStatus; lastSyncedAt: number | null }>({
    status: 'idle',
    lastSyncedAt: null
  });
  const [backups, setBackups] = useState<VaultBackup[]>([]);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [healthSummary, setHealthSummary] = useState<PasswordHealthSummary | null>(null);
  const [isPasskeysOpen, setIsPasskeysOpen] = useState(false);
  const [isWatchtowerOpen, setIsWatchtowerOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const passkeySupported = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
  const [isScanningBreaches, setIsScanningBreaches] = useState(false);
  const [breachScanError, setBreachScanError] = useState<string | null>(null);
  const [lastBreachScanAt, setLastBreachScanAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem('safenode_last_breach_scan');
    return raw ? Number(raw) : null;
  });
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem('safenode_watchtower_dismissed');
    return raw ? JSON.parse(raw) : [];
  });

  const handleVaultUnlocked = (unlockedVault: VaultData) => {
    setVault(unlockedVault);
    setIsUnlocked(true);
  };

  const handleLock = () => {
    setVault(null);
    setIsUnlocked(false);
    setUser(null);
    setCurrentPage('landing');
    syncManager.stop();
  };

  const handleKeyRotationSuccess = () => {
    // After successful key rotation, lock the vault
    // User will need to log in with new password
    handleLock();
    alert('Master key rotated successfully! Please log in with your new password.');
  };

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status, info) => {
      setSyncState({ status, lastSyncedAt: info.lastSyncedAt });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && currentPage === 'vault') {
      syncManager.start();
      return () => {
        syncManager.stop();
      };
    }
    syncManager.stop();
  }, [user, currentPage]);

  useEffect(() => {
    if (vault && vault.entries.length > 0) {
      setHealthSummary(evaluatePasswordHealth(vault.entries));
    } else {
      setHealthSummary(null);
    }
  }, [vault]);

useEffect(() => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('safenode_watchtower_dismissed', JSON.stringify(dismissedAlerts));
}, [dismissedAlerts]);

useEffect(() => {
  if (!vault || isScanningBreaches) return;
  const threshold = 24 * 60 * 60 * 1000; // 24h
  if (!lastBreachScanAt || Date.now() - lastBreachScanAt > threshold) {
    handleBreachScan();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [vault]);

useEffect(() => {
  const issues = healthSummary?.issues ?? [];
  setDismissedAlerts(prev => {
    const validKeys = new Set(issues.map(watchtowerIssueKey));
    const filtered = prev.filter(key => validKeys.has(key));
    return filtered.length === prev.length ? prev : filtered;
  });
}, [healthSummary]);

const watchtowerIssues = healthSummary?.issues ?? [];
const unresolvedHighAlerts = useMemo(
  () =>
    watchtowerIssues.filter(
      (issue) => issue.severity === 'high' && !dismissedAlerts.includes(watchtowerIssueKey(issue))
    ),
  [watchtowerIssues, dismissedAlerts]
);

  const handleBreachScan = async () => {
    if (!vault) return;

    setIsScanningBreaches(true);
    setBreachScanError(null);

    try {
      const passwordCache = new Map<string, number>();
      const updatedEntries: VaultEntry[] = [];

      for (const entry of vault.entries) {
        let breachCount = entry.breachCount ?? null;
        if (entry.password) {
          if (passwordCache.has(entry.password)) {
            breachCount = passwordCache.get(entry.password)!;
          } else {
            const count = await getPasswordBreachCount(entry.password);
            passwordCache.set(entry.password, count);
            breachCount = count;
          }
        }

        updatedEntries.push({
          ...entry,
          breachCount,
          lastBreachCheck: Date.now()
        });
      }

      const updatedVault = { ...vault, entries: updatedEntries };
      await saveVaultToServer(updatedVault, 'UPDATE');
      setVault(updatedVault);
      setLastBreachScanAt(Date.now());
    } catch (error) {
      console.error('Breach scan failed:', error);
      setBreachScanError(error instanceof Error ? error.message : 'Failed to run breach scan');
    } finally {
      setIsScanningBreaches(false);
    }
  };

  const refreshBackups = async () => {
    try {
      const list = await backupManager.listBackups();
      setBackups(list);
    } catch (error) {
      console.error('Failed to load backups', error);
    }
  };

  useEffect(() => {
    if (user && currentPage === 'vault') {
      refreshBackups();
    }
  }, [user, currentPage]);

  const formatLastSynced = (timestamp: number | null) => {
    if (!timestamp) return 'Pending sync…';
    const diffMs = Date.now() - timestamp;
    if (diffMs < 15_000) return 'Synced just now';
    if (diffMs < 60_000) return 'Synced < 1 min ago';
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `Synced ${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Synced ${hours} hr${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `Synced ${days} day${days > 1 ? 's' : ''} ago`;
  };

  const handleBackupNow = async () => {
    setIsBackupLoading(true);
    setBackupError(null);
    try {
      await backupManager.createBackup();
      await refreshBackups();
    } catch (error) {
      console.error('Failed to create backup', error);
      setBackupError(error instanceof Error ? error.message : 'Failed to create backup');
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('Restore this backup? Your current vault will be replaced locally.')) return;
    setIsBackupLoading(true);
    setBackupError(null);
    try {
      await backupManager.restoreBackup(backupId);
      await refreshBackups();
      alert('Backup restored locally. Please unlock with your master password to continue.');
      handleLock();
    } catch (error) {
      console.error('Failed to restore backup', error);
      setBackupError(error instanceof Error ? error.message : 'Failed to restore backup');
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      const blob = await backupManager.downloadBackup(backupId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safenode-backup-${backupId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download backup', error);
      alert('Failed to download backup');
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Delete this backup permanently?')) return;
    try {
      await backupManager.deleteBackup(backupId);
      await refreshBackups();
    } catch (error) {
      console.error('Failed to delete backup', error);
      alert('Failed to delete backup');
    }
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    setIsEntryFormOpen(true);
  };

  const handleEditEntry = (entry: VaultEntry) => {
    setEditingEntry(entry);
    setIsEntryFormOpen(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!vault || !confirm('Are you sure you want to delete this entry?')) return;

    setIsSaving(true);
    try {
      // Remove entry from vault
      const updatedEntries = vault.entries.filter(entry => entry.id !== entryId);
      const updatedVault = { ...vault, entries: updatedEntries };

      // Encrypt and save
      await saveVaultToServer(updatedVault, 'DELETE', entryId);
      setVault(updatedVault);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveVaultToServer = async (vaultData: VaultData, operation: 'CREATE' | 'UPDATE' | 'DELETE', entryId?: string) => {
    try {
      // Get stored vault to get salt
      const storedVault = await vaultStorage.getVault();
      if (!storedVault) throw new Error('No vault found');

      const salt = base64ToArrayBuffer(storedVault.salt);
      
      // Encrypt the updated vault
      const vaultJson = JSON.stringify(vaultData);
      const encrypted = await encrypt(vaultJson, 'demo-password', salt);
      
      const payload = {
        encryptedVault: arrayBufferToBase64(encrypted.encrypted),
        iv: arrayBufferToBase64(encrypted.iv),
        version: Date.now()
      };

      // Determine endpoint and method
      let endpoint = '/api/vault/entry';
      let method = 'POST';
      
      if (operation === 'UPDATE' && entryId) {
        endpoint = `/api/vault/entry/${entryId}`;
        method = 'PUT';
      } else if (operation === 'DELETE' && entryId) {
        endpoint = `/api/vault/entry/${entryId}`;
        method = 'DELETE';
      }

      // Send to server
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Update local storage
      const updatedStoredVault = vaultStorage.createVault(
        payload.encryptedVault,
        payload.iv,
        storedVault.salt,
        payload.version
      );
      await vaultStorage.storeVault(updatedStoredVault);

    } catch (error) {
      console.error('Failed to save vault:', error);
      throw error;
    }
  };

  const handleSaveEntry = async (entryData: VaultEntry) => {
    if (!vault) return;

    setIsSaving(true);
    try {
      let updatedEntries: VaultEntry[];
      const isEditing = editingEntry !== null;

      if (isEditing) {
        // Update existing entry
        updatedEntries = vault.entries.map(entry => 
          entry.id === entryData.id ? entryData : entry
        );
      } else {
        // Add new entry
        updatedEntries = [...vault.entries, entryData];
      }

      const updatedVault = { ...vault, entries: updatedEntries };
      
      // Save to server
      await saveVaultToServer(updatedVault, isEditing ? 'UPDATE' : 'CREATE', entryData.id);
      
      // Update local state
      setVault(updatedVault);
      setIsEntryFormOpen(false);
      setEditingEntry(null);

    } catch (error) {
      console.error('Failed to save entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Show landing page initially
  if (currentPage === 'landing') {
    return <Landing onEnterApp={(mode) => {
      setAuthMode(mode || 'signup');
      setCurrentPage('auth');
    }} />
  }

  // Show authentication page
  if (currentPage === 'auth') {
    return (
      <Auth 
        onAuthenticated={(userData) => {
          setUser(userData)
          setVault(null)
          setIsUnlocked(false)
          setCurrentPage('vault')
        }}
        onBackToLanding={() => setCurrentPage('landing')}
        initialMode={authMode}
      />
    )
  }

  // Show vault unlock screen for authenticated users
  if (user && !isUnlocked) {
    return <UnlockVault onVaultUnlocked={handleVaultUnlocked} />
  }

  const filteredEntries = (vault?.entries || []).filter((e) => {
    const matchesQuery = !query.trim() ||
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.username.toLowerCase().includes(query.toLowerCase()) ||
      (e.url?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
      (e.notes?.toLowerCase().includes(query.toLowerCase()) ?? false)
    const matchesTag = !activeTag || (e.tags?.includes(activeTag) ?? false)
    return matchesQuery && matchesTag
  })

  const allTags = Array.from(new Set((vault?.entries || []).flatMap(e => e.tags || []))).sort()

  const containerVariants = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 }
  }

  const listParent = prefersReducedMotion ? undefined : {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } }
  }

  const listItem = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="flex justify-between items-center h-12" initial={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }} animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center space-x-3">
              <motion.div 
                className="inline-flex items-center justify-center w-8 h-8 bg-purple-600 rounded-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </motion.div>
              <h1 className="text-xl font-bold text-slate-900">SafeNode</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-600">
                {vault?.entries.length || 0} entries
              </span>
              <div className="flex items-center text-xs">
                {syncState.status === 'syncing' ? (
                  <span className="flex items-center gap-1 text-purple-600">
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                    Syncing…
                  </span>
                ) : syncState.status === 'error' ? (
                  <span className="flex items-center gap-1 text-red-600">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Sync error
                  </span>
                ) : (
                  <span className="text-slate-500">{formatLastSynced(syncState.lastSyncedAt)}</span>
                )}
              </div>
              <Button
                onClick={() => setIsSharingKeysOpen(true)}
                variant="outline"
                size="sm"
                title="Manage sharing keys"
              >
                Keys
              </Button>
              <Button
                onClick={() => setIsImportOpen(true)}
                variant="outline"
                size="sm"
                title="Import shared entry"
              >
                Import
              </Button>
              <Button
                onClick={() => setIsBackupModalOpen(true)}
                variant="outline"
                size="sm"
                title="Backups"
              >
                Backups
              </Button>
              {passkeySupported && (
                <Button
                  onClick={() => setIsPasskeysOpen(true)}
                  variant="outline"
                  size="sm"
                  title="Manage passkeys"
                >
                  Passkeys
                </Button>
              )}
              <Button
                onClick={() => setIsKeyRotationOpen(true)}
                variant="outline"
                size="sm"
                title="Change master password"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Change Password
              </Button>
              <Button
                onClick={handleLock}
                variant="outline"
                size="sm"
              >
                <LockIcon className="w-3 h-3" />
                Lock
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {vault && vault.entries.length > 0 ? (
          <motion.div className="space-y-4" initial="hidden" animate="visible" variants={containerVariants}>
            {/* Password Health */}
            {healthSummary && (
              <motion.div
                className="card card-hover"
                variants={listItem}
              >
                <div className="card-body space-y-4">
                  {unresolvedHighAlerts.length > 0 && (
                    <WatchtowerBanner
                      issues={unresolvedHighAlerts}
                      onReview={() => setIsWatchtowerOpen(true)}
                      onDismiss={(issueId) =>
                        setDismissedAlerts((prev) => (prev.includes(issueId) ? prev : [...prev, issueId]))
                      }
                    />
                  )}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-slate-500">Vault Health</p>
                      <div className="flex items-baseline gap-3 mt-1">
                        <span className="text-3xl font-semibold text-slate-900">{healthSummary.score}</span>
                        <span className="text-sm text-slate-500">/ 100</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span>Strong: {healthSummary.strongCount}</span>
                          <span>Weak: {healthSummary.weakCount}</span>
                          <span>Reused: {healthSummary.reusedCount}</span>
                          <span>Compromised: {healthSummary.compromisedCount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-600 mb-1">Priority issues</p>
                      {healthSummary.issues.length === 0 ? (
                        <p className="text-xs text-slate-500">All clear. No outstanding problems detected.</p>
                      ) : (
                        <ul className="space-y-1">
                          {healthSummary.issues.slice(0, 4).map(issue => (
                            <li key={`${issue.entryId}-${issue.type}`} className="text-xs text-slate-600">
                              <span className="font-medium text-slate-800">{issue.entryName}</span>: {issue.message}
                            </li>
                          ))}
                          {healthSummary.issues.length > 4 && (
                            <li className="text-xs text-slate-500">
                              +{healthSummary.issues.length - 4} more issues
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleBreachScan}
                        variant="outline"
                        size="sm"
                        disabled={isScanningBreaches || !vault}
                      >
                        {isScanningBreaches ? 'Scanning…' : 'Run breach scan'}
                      </Button>
                      <Button
                        onClick={() => setIsWatchtowerOpen(true)}
                        variant="outline"
                        size="sm"
                      >
                        Open Watchtower
                      </Button>
                      {lastBreachScanAt && (
                        <p className="text-[11px] text-slate-500">
                          Last scan {formatLastSynced(lastBreachScanAt)}
                        </p>
                      )}
                      {breachScanError && (
                        <p className="text-[11px] text-red-600">{breachScanError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Security Advisor */}
            <SecurityAdvisor entries={(vault?.entries || []).map(e => ({
              id: e.id,
              name: e.name,
              username: e.username,
              password: e.password,
              url: e.url
            }))} />
            {/* Search + Tags + Add Button */}
            <motion.div className="card card-hover" variants={listItem}>
              <div className="card-body">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="relative">
                  <input
                    className="w-full md:w-80 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all duration-200"
                    placeholder="Search vault..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    role="searchbox"
                    aria-label="Search vault entries"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <SearchIcon className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <motion.button
                      onClick={() => setActiveTag(null)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${
                        activeTag === null 
                          ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-900 shadow-lg' 
                          : 'bg-white/80 backdrop-blur-sm text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-md'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-pressed={activeTag === null}
                    >All</motion.button>
                    {allTags.map(tag => (
                      <motion.button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${
                          activeTag === tag 
                            ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-900 shadow-lg' 
                            : 'bg-white/80 backdrop-blur-sm text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-md'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-pressed={activeTag === tag}
                      >{tag}</motion.button>
                    ))}
                  </div>
                  <Button
                    onClick={handleAddEntry}
                    disabled={isSaving}
                    variant="primary"
                    size="sm"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Entry
                  </Button>
                </div>
              </div>
              </div>
            </motion.div>
            {/* Stats Cards */}
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" variants={listParent} initial="hidden" animate="visible">
              <motion.div 
                className="card card-hover" 
                variants={listItem}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Total Entries</p>
                      <p className="text-2xl font-bold text-slate-900">{vault.entries.length}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="card card-hover" 
                variants={listItem}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/10">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Secure</p>
                      <p className="text-2xl font-bold text-slate-900">100%</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="card card-hover" 
                variants={listItem}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/10">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-600">Encrypted</p>
                      <p className="text-2xl font-bold text-slate-900">AES-256</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Entries List */}
            <motion.div className="card overflow-hidden" variants={listItem}>
              <div className="card-header">
                <h2 className="text-lg font-bold text-slate-900">Password Entries</h2>
                <p className="text-sm text-slate-600">Your encrypted password vault</p>
              </div>
              <div className="card-body p-0">
                <motion.div className="divide-y divide-slate-200" variants={listParent} initial="hidden" animate="visible">
                {filteredEntries.map((entry, index) => (
                  <EntryCard 
                    key={entry.id} 
                    entry={entry} 
                    index={index}
                    onCopyPassword={() => enhancedCopyToClipboard(entry.password)}
                    onShare={() => setShareEntry(entry)}
                    onEdit={() => handleEditEntry(entry)}
                    onDelete={() => handleDeleteEntry(entry.id)}
                    isSaving={isSaving}
                    variants={listItem}
                  />
                ))}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No entries found</h3>
            <p className="text-slate-600">Your vault is empty. Add some password entries to get started.</p>
        </div>
      )}
      </main>

      {/* Entry Form Modal */}
      <EntryForm
        entry={editingEntry}
        isOpen={isEntryFormOpen}
        onClose={() => {
          setIsEntryFormOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
      />

      {/* Key Rotation Modal */}
      <KeyRotation
        isOpen={isKeyRotationOpen}
        onClose={() => setIsKeyRotationOpen(false)}
        onSuccess={handleKeyRotationSuccess}
      />

      {/* Sharing */}
      <SharingKeys isOpen={isSharingKeysOpen} onClose={() => setIsSharingKeysOpen(false)} />
      <ShareEntryModal isOpen={!!shareEntry} onClose={() => setShareEntry(null)} entry={shareEntry} />
      <ImportSharedModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={(entry) => {
        // Reuse existing flow to add entry
        if (!vault) return;
        const updated = { ...vault, entries: [...vault.entries, entry] }
        setVault(updated)
        // Persist via existing save function if available
      }} />
      <PasskeysModal isOpen={isPasskeysOpen} onClose={() => setIsPasskeysOpen(false)} />
      <WatchtowerModal
        isOpen={isWatchtowerOpen}
        onClose={() => setIsWatchtowerOpen(false)}
        summary={healthSummary}
        dismissed={dismissedAlerts}
        onDismiss={(issueId) =>
          setDismissedAlerts((prev) => (prev.includes(issueId) ? prev : [...prev, issueId]))
        }
        onRescan={handleBreachScan}
        scanning={isScanningBreaches}
        lastScanAt={lastBreachScanAt}
      />

      {isBackupModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Backups</h2>
                <p className="text-sm text-slate-500">Encrypted snapshots stored locally.</p>
              </div>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {backupError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {backupError}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">
                    {backups.length
                      ? `${backups.length} backup${backups.length === 1 ? '' : 's'} stored`
                      : 'No backups yet'}
                  </p>
                </div>
                <Button onClick={handleBackupNow} size="sm" disabled={isBackupLoading}>
                  {isBackupLoading ? 'Backing up…' : 'Backup now'}
                </Button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {backups.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500 text-center">
                    Once you create a backup, it will appear here.
                  </div>
                ) : (
                  backups.map((backup) => (
                    <div key={backup.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {backup.label || new Date(backup.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          Version {backup.vault.version} • Saved {new Date(backup.vault.lastModified).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadBackup(backup.id)}
                        >
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreBackup(backup.id)}
                        >
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBackup(backup.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
              Backups remain encrypted with your master password. Restoring will replace the local vault only.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
 
// Enhanced Entry Card Component
interface EntryCardProps {
  entry: VaultEntry;
  index: number;
  onCopyPassword: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSaving: boolean;
  variants?: any;
}

const EntryCard: React.FC<EntryCardProps> = ({ 
  entry, 
  index, 
  onCopyPassword, 
  onShare, 
  onEdit, 
  onDelete, 
  isSaving, 
  variants 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const base64ToBlobUrl = (attachment: VaultAttachment): string => {
    const binary = window.atob(attachment.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: attachment.type || 'application/octet-stream' });
    return URL.createObjectURL(blob);
  };

  const handleDownloadAttachment = (attachment: VaultAttachment) => {
    try {
      const url = base64ToBlobUrl(attachment);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('Unable to download attachment');
    }
  };

  const handleCopyPassword = async () => {
    onCopyPassword();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'credit card':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'identity':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'secure note':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'credit card':
        return 'from-blue-500 to-cyan-500';
      case 'identity':
        return 'from-green-500 to-emerald-500';
      case 'secure note':
        return 'from-orange-500 to-amber-500';
      default:
        return 'from-purple-500 to-pink-500';
    }
  };

  return (
    <motion.div 
      className={`group relative p-4 transition-all duration-300 ${
        isHovered 
          ? 'bg-gradient-to-r from-slate-50 to-purple-50 shadow-lg border-l-4 border-purple-500' 
          : 'hover:bg-slate-50'
      }`}
      variants={variants}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={prefersReducedMotion ? undefined : { 
        scale: 1.005,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
    >
      <div className="flex items-start justify-between">
        {/* Entry Info Section */}
        <div className="flex items-start space-x-3 flex-1">
          {/* Avatar/Icon */}
          <motion.div 
            className={`flex-shrink-0 w-10 h-10 bg-gradient-to-r ${getCategoryColor(entry.category)} rounded-lg flex items-center justify-center shadow-md`}
            whileHover={prefersReducedMotion ? undefined : { 
              scale: 1.05,
              rotate: 3,
              transition: { duration: 0.2 }
            }}
          >
            {entry.category ? (
              <div className="text-white">
                {getCategoryIcon(entry.category)}
              </div>
            ) : (
              <span className="text-white font-bold text-sm">
                {entry.name.charAt(0).toUpperCase()}
              </span>
            )}
          </motion.div>

          {/* Entry Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-base font-semibold text-slate-900 truncate">{entry.name}</h3>
              {entry.category && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {entry.category}
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-600 mb-1.5 truncate">
              {entry.username} {entry.url && `• ${entry.url}`}
            </p>

            {/* Password Field */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={entry.password}
                  readOnly
                  className="px-2.5 py-1 text-xs font-mono bg-slate-100 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  style={{ width: `${Math.max(entry.password.length * 7, 100)}px` }}
                />
                <motion.button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1/2 transform -translate-y-1/2 p-0.5 hover:bg-slate-200 rounded transition-colors"
                  whileTap={{ scale: 0.95 }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {entry.tags.map(tag => (
                  <motion.span 
                    key={tag} 
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200"
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{entry.notes}</p>
            )}

            {entry.attachments && entry.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-slate-600">Attachments</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {entry.attachments.slice(0, 3).map((attachment) => (
                    <button
                      key={attachment.id}
                      type="button"
                      onClick={() => handleDownloadAttachment(attachment)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12v9m0 0l-3-3m3 3l3-3M12 3v9m0 0l3-3m-3 3l-3-3" />
                      </svg>
                      {attachment.name}
                    </button>
                  ))}
                  {entry.attachments.length > 3 && (
                    <span className="text-slate-500">+{entry.attachments.length - 3} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Section */}
        <motion.div 
          className="flex items-center gap-1.5 ml-3"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: isHovered ? 1 : 0.7 }}
          transition={{ duration: 0.2 }}
        >
          {/* Copy Button */}
          <motion.button
            onClick={handleCopyPassword}
            className={`relative inline-flex items-center px-2.5 py-1.5 rounded-md font-medium text-xs transition-all duration-200 ${
              copyFeedback
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm'
            }`}
            whileHover={prefersReducedMotion ? undefined : { 
              scale: 1.05,
              y: -1
            }}
            whileTap={{ scale: 0.95 }}
            title="Copy password"
            aria-label={`Copy password for ${entry.name}`}
          >
            <motion.div
              animate={copyFeedback ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.3 }}
            >
              {copyFeedback ? (
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </motion.div>
            {copyFeedback ? 'Copied!' : 'Copy'}
          </motion.button>

          {/* Share Button */}
          <motion.button
            onClick={onShare}
            className="inline-flex items-center px-2.5 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium text-xs transition-all duration-200 shadow-sm"
            whileHover={prefersReducedMotion ? undefined : { 
              scale: 1.05,
              y: -1
            }}
            whileTap={{ scale: 0.95 }}
            title="Share entry"
            aria-label={`Share ${entry.name}`}
          >
            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Share
          </motion.button>

          {/* Edit Button */}
          <motion.button
            onClick={onEdit}
            disabled={isSaving}
            className="inline-flex items-center px-2.5 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 font-medium text-xs transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={isSaving ? undefined : { 
              scale: 1.05,
              y: -1
            }}
            whileTap={{ scale: 0.95 }}
            title="Edit entry"
            aria-label={`Edit ${entry.name}`}
          >
            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </motion.button>

          {/* Delete Button */}
          <motion.button
            onClick={onDelete}
            disabled={isSaving}
            className="inline-flex items-center px-2.5 py-1.5 bg-white text-red-600 border border-red-300 rounded-md hover:bg-red-50 hover:border-red-400 hover:text-red-700 font-medium text-xs transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={isSaving ? undefined : { 
              scale: 1.05,
              y: -1
            }}
            whileTap={{ scale: 0.95 }}
            title="Delete entry"
            aria-label={`Delete ${entry.name}`}
          >
            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </motion.button>

          {/* TOTP Badge */}
          {entry.totpSecret && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <TotpBadge secret={entry.totpSecret} />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Copy Success Toast */}
      {copyFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.8 }}
          className="absolute top-3 right-3 bg-green-500 text-white px-2.5 py-1 rounded-md text-xs font-medium shadow-lg z-10"
        >
          Copied!
        </motion.div>
      )}
    </motion.div>
  );
};

function TotpBadge({ secret }: { secret: string }) {
  const [code, setCode] = React.useState<string>('------')
  const [remaining, setRemaining] = React.useState<number>(30 - (Math.floor(Date.now()/1000) % 30))

  React.useEffect(() => {
    let mounted = true
    const update = async () => {
      try {
        const newCode = await generateTotpCode(secret)
        if (mounted) setCode(newCode)
      } catch {}
    }
    update()
    const tick = setInterval(() => {
      const r = 30 - (Math.floor(Date.now()/1000) % 30)
      setRemaining(r)
      if (r === 30) {
        update()
      }
    }, 1000)
    return () => { mounted = false; clearInterval(tick) }
  }, [secret])

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm">
      <span className="font-mono tracking-widest text-xs font-semibold">{code}</span>
      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full ${remaining > 10 ? 'bg-green-400' : remaining > 5 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
        <span className="text-xs text-slate-500">{remaining}s</span>
      </div>
    </div>
  )
}