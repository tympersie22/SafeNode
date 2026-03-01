import React, { useEffect, useMemo, useState, startTransition, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { UnlockVault } from './components/UnlockVaultNew';
import { MasterPasswordSetup } from './components/MasterPasswordSetup';
import EntryForm from './components/EntryForm';
import { generateTotpCode, encrypt, arrayBufferToBase64, base64ToArrayBuffer, getPasswordBreachCount, generateSecurePassword } from './crypto/crypto';
import { vaultStorage } from './storage/vaultStorage';
import { vaultSync } from './sync/vaultSync';
import { enhancedCopyToClipboard, isTauri, DesktopVault } from './desktop/integration';
import KeyRotation from './components/KeyRotation';
import SharingKeys from './components/SharingKeys';
import ShareEntryModal from './components/ShareEntryModal';
import ImportSharedModal from './components/ImportSharedModal';
import Button from './components/ui/Button';
import { showToast } from './components/ui/Toast';
import { Spinner } from './components/ui/Spinner';
import { Logout } from './icons/Logout';
import Logo from './components/Logo';
import Home from './pages/Home';
import Auth from './pages/Auth';
import { SettingsPage } from './pages/settings/index';
import { SubscribePage } from './pages/billing/Subscribe';
import { syncManager, SyncStatus } from './sync/syncManager';
import { backupManager } from './sync/backupManager';
import type { VaultBackup } from './storage/backupStorage';
import { API_BASE } from './config/api';
import type { VaultEntry, VaultAttachment } from './types/vault';
import { evaluatePasswordHealth, type PasswordHealthSummary } from './health/passwordHealth';
import PasskeysModal from './components/PasskeysModal';
import WatchtowerModal, { watchtowerIssueKey } from './components/WatchtowerModal';
import { useTravelMode } from './utils/travelMode';
import { useDarkMode } from './utils/darkMode';
import AccountSwitcher from './components/AccountSwitcher';
import AuditLogsModal from './components/AuditLogsModal';
import TeamVaultsModal from './components/TeamVaultsModal';
import PINSetupModal from './components/PINSetupModal';
import BiometricSetupModal from './components/BiometricSetupModal';
import { accountStorage, type Account } from './storage/accountStorage';
import { auditLogStorage } from './storage/auditLogs';
import { teamVaultStorage } from './storage/teamVaults';
import { pinManager } from './utils/pinManager';
// keychainService is dynamically imported where needed to reduce bundle size
import { apiPost, apiPut, apiDelete } from './utils/apiClient';
import { getCurrentDeviceHeaders } from './services/deviceService';
import PasswordGeneratorModal from './components/PasswordGeneratorModal';
import StrengthenPasswordsModal from './components/StrengthenPasswordsModal';
import VaultDashboard from './components/dashboard/VaultDashboard';
import { DashboardLayout } from './layout/DashboardLayout';
import type { SidebarItem } from './ui/SaasSidebar';

interface VaultData {
  entries: VaultEntry[];
}

// Single source of truth for vault state
type VaultStatus = 'LOCKED' | 'UNLOCKED'

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [vault, setVault] = useState<VaultData | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>('LOCKED');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isKeyRotationOpen, setIsKeyRotationOpen] = useState(false);
  const [isSharingKeysOpen, setIsSharingKeysOpen] = useState(false);
  const [shareEntry, setShareEntry] = useState<VaultEntry | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { user, isAuthenticated, isAuthInitialized, logout: authLogout } = useAuth();
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
  const { isEnabled: isTravelModeEnabled, enable: enableTravelMode, disable: disableTravelMode } = useTravelMode();
  const { isDark: isDarkMode, toggle: toggleDarkMode } = useDarkMode();
  
  // New feature states
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [isTeamVaultsOpen, setIsTeamVaultsOpen] = useState(false);
  const [isPINSetupOpen, setIsPINSetupOpen] = useState(false);
  const [isBiometricSetupOpen, setIsBiometricSetupOpen] = useState(false);
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [vaultSalt, setVaultSalt] = useState<ArrayBuffer | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showMasterPasswordSetup, setShowMasterPasswordSetup] = useState(false);
  const [isPasswordGeneratorOpen, setIsPasswordGeneratorOpen] = useState(false);
  const [isStrengthenPasswordsOpen, setIsStrengthenPasswordsOpen] = useState(false);
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<VaultEntry | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionTimeoutMinutes] = useState(30); // 30 minute session timeout
  const [remainingSessionTime, setRemainingSessionTime] = useState<number | null>(null);
  const [syncPendingCount, setSyncPendingCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Auth is now handled by AuthProvider - no need for local auth checking
  const syncStartedFor = useRef<string | null>(null); // Track which user/vault combo we started sync for
  
  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status, info) => {
      setSyncState({ status, lastSyncedAt: info.lastSyncedAt });
      if (status === 'error') {
        setSyncError('Sync failed. Check your connection and try again.');
      } else {
        setSyncError(null);
      }
    });
    return unsubscribe;
  }, []);

  // Session timeout tracking
  useEffect(() => {
    if (vaultStatus === 'UNLOCKED' && !sessionStartTime) {
      setSessionStartTime(Date.now());
    } else if (vaultStatus === 'LOCKED') {
      setSessionStartTime(null);
      setRemainingSessionTime(null);
    }
  }, [vaultStatus, sessionStartTime]);

  // Update remaining session time (real-time)
  useEffect(() => {
    if (!sessionStartTime || vaultStatus !== 'UNLOCKED') {
      setRemainingSessionTime(null);
      return;
    }

    const updateTimer = () => {
      if (!sessionStartTime) return;
      
      const now = Date.now();
      const elapsed = (now - sessionStartTime) / 1000; // elapsed seconds
      const totalTimeoutSeconds = sessionTimeoutMinutes * 60;
      const remainingSeconds = totalTimeoutSeconds - elapsed;
      const remainingMinutes = remainingSeconds / 60;
      
      // Update state every second for real-time countdown (this triggers re-render)
      setRemainingSessionTime(Math.max(0, remainingMinutes));

      // Show warning at 2 minutes remaining (only once per session)
      if (remainingMinutes > 0 && remainingMinutes <= 2 && remainingMinutes > 1.98) {
        // Use a ref or state to track if warning was shown
        const warningKey = `warning-${sessionStartTime}`;
        if (!sessionStorage.getItem(warningKey)) {
          sessionStorage.setItem(warningKey, 'true');
          showToast.info('Your session will expire in 2 minutes. Click anywhere to extend.');
        }
      }

      // Auto-lock when session expires
      if (remainingSeconds <= 0) {
        handleLock();
        showToast.info('Session expired for security. Please unlock again.');
      }
    };

    // Update immediately for instant display
    updateTimer();
    
    // Update every second for real-time countdown
    const interval = setInterval(updateTimer, 1000);
    
    return () => {
      clearInterval(interval);
      // Clear warning flag when component unmounts or session changes
      if (sessionStartTime) {
        sessionStorage.removeItem(`warning-${sessionStartTime}`);
      }
    };
  }, [sessionStartTime, vaultStatus, sessionTimeoutMinutes]);

  // Extend session on user activity
  useEffect(() => {
    if (vaultStatus !== 'UNLOCKED') return;

    const extendSession = () => {
      if (sessionStartTime) {
        setSessionStartTime(Date.now());
      }
    };

    // Extend on any user interaction
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, extendSession, { passive: true }));
    return () => events.forEach(event => window.removeEventListener(event, extendSession));
  }, [vaultStatus, sessionStartTime]);

  // Sync auth mode from URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const mode = params.get('mode')
    if (mode === 'login' || mode === 'signup') {
      setAuthMode(mode)
    }
  }, [location.search])

  useEffect(() => {
    const isOnVaultPage = location.pathname.startsWith('/vault');
    const syncKey = `${user?.id || 'none'}-${vaultStatus}-${isOnVaultPage}`;
    
    if (user && isOnVaultPage && vaultStatus === 'UNLOCKED') {
      // Only start if we haven't already started for this combination
      if (syncStartedFor.current !== syncKey) {
        syncStartedFor.current = syncKey;
        syncManager.start();
      }
      return () => {
        // Only stop if we're changing away from this combination
        if (syncStartedFor.current === syncKey) {
          syncStartedFor.current = null;
          syncManager.stop();
        }
      };
    } else {
      // Stop if we were running for a different combination
      if (syncStartedFor.current && syncStartedFor.current !== syncKey) {
        syncStartedFor.current = null;
        syncManager.stop();
      }
    }
  }, [user?.id, location.pathname, vaultStatus]);

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

  // Defer breach scanning - run in background after unlock, don't block access
  useEffect(() => {
    // Skip if vault is not unlocked or already scanning
    if (!vault || vaultStatus !== 'UNLOCKED' || isScanningBreaches) return;
    
    // Skip if vault is empty (no entries to scan)
    if (!vault.entries || vault.entries.length === 0) return;
    
    // Check if we need to scan (24h threshold)
    const threshold = 24 * 60 * 60 * 1000; // 24h
    if (lastBreachScanAt && Date.now() - lastBreachScanAt <= threshold) return;
    
    // Defer scan to run asynchronously in background - don't block user
    // Use setTimeout to ensure it runs after vault is fully loaded
    const scanTimeout = setTimeout(() => {
      handleBreachScan().catch(error => {
        // Silently handle errors - don't block user, just log
        console.error('Background breach scan failed:', error);
      });
    }, 500); // Small delay to ensure vault UI is rendered first
    
    return () => clearTimeout(scanTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault, vaultStatus, isScanningBreaches, lastBreachScanAt]);

  useEffect(() => {
    const issues = healthSummary?.issues ?? [];
    setDismissedAlerts(prev => {
      const validKeys = new Set(issues.map(watchtowerIssueKey));
      const filtered = prev.filter(key => validKeys.has(key));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [healthSummary]);

  useEffect(() => {
    const isOnVaultPage = location.pathname.startsWith('/vault');
    if (user && isOnVaultPage) {
      refreshBackups();
    }
  }, [user, location.pathname]);

  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.more-menu-container')) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen]);

  const handleVaultUnlocked = (unlockedVault: VaultData, password: string, salt: ArrayBuffer) => {
    // CRITICAL: Vault unlock is NOT authentication - it's local state only
    // This function MUST NOT:
    // - Call navigate() (React Router owns navigation)
    // - Call getCurrentUser() (AuthProvider owns auth)
    // - Trigger auth refresh (vault state is separate from auth state)
    
    // Prevent multiple calls
    if (vaultStatus === 'UNLOCKED') {
      return;
    }
    
    // Update vault state ONLY - pure state update, no side effects
    setVault(unlockedVault);
    setVaultStatus('UNLOCKED');
    setMasterPassword(password);
    setVaultSalt(salt);
    
    // NO NAVIGATION - Route guards ensure we're on the correct route
    // If user is on /vault, ProtectedRoute keeps them there
    // If user is elsewhere, they shouldn't be unlocking vault
    
    // Initialize account storage and load current account (fire-and-forget)
     accountStorage.init().then(async () => {
      try {
        const activeAccount = await accountStorage.getActiveAccount();
        const currentUserEmail = user?.email?.toLowerCase();
        
        // Check if active account belongs to current user (email must match)
        if (activeAccount && activeAccount.email?.toLowerCase() === currentUserEmail) {
          setCurrentAccount(activeAccount);
        } else {
          // No matching account found - create new account with user's displayName from signup
          const accountName = user?.displayName || 'Personal';
          const defaultAccount = await accountStorage.createAccount(
            accountName,
            user?.email || 'demo@safe-node.app',
            'personal'
          );
          setCurrentAccount(defaultAccount);
        }
      } catch (error) {
        console.error('Failed to initialize account storage:', error);
        showToast.error('Failed to load account settings. Using defaults.');
      }
    }).catch(error => {
      console.error('Failed to init account storage:', error);
      showToast.error('Failed to load account settings. Using defaults.');
    });
    
    // Store master password in keychain for biometric unlock (fire-and-forget)
    // Use dynamic import - Vite will handle it correctly
    (async () => {
      try {
        const { keychainService } = await import('./utils/keychain');
        keychainService.save({
          service: 'safenode',
          account: 'master_password',
          password: password
        }).catch((error: any) => {
          console.warn('Failed to store password in keychain:', error);
          showToast.info('Could not enable biometric unlock. You can set this up later in settings.');
        });
      } catch (error) {
        // Silently fail if keychain is not available
      }
    })();
    
    // Store encrypted vault in IndexedDB for future saves (fire-and-forget)
    // This ensures saveVaultToServer can access the salt
    vaultStorage.init().then(async () => {
      try {
        // Get the encrypted vault from server to store it
        const token = localStorage.getItem('safenode_token');
        if (token) {
          const vaultResponse = await fetch(`${API_BASE}/api/auth/vault/latest`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              ...getCurrentDeviceHeaders()
            }
          });
          
          if (vaultResponse.ok) {
            const vaultData = await vaultResponse.json();
            if (vaultData.encryptedVault && vaultData.iv && vaultData.salt) {
              const storedVault = vaultStorage.createVault(
                vaultData.encryptedVault,
                vaultData.iv,
                vaultData.salt,
                vaultData.version || Date.now()
              );
              await vaultStorage.storeVault(storedVault);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to store vault in IndexedDB:', error);
        // Non-critical - we can still save using state salt
      }
    }).catch(error => {
      console.warn('Failed to init vault storage:', error);
    });
  };

  const handleLock = () => {
    // CRITICAL: Lock vault is local state only - does NOT logout
    // If user wants to logout, they should use the logout button
    // This just locks the vault (clears local decryption state)
    setVault(null);
    setVaultStatus('LOCKED');
    setMasterPassword('');
    setVaultSalt(null);
    setSessionStartTime(null);
    setRemainingSessionTime(null);
    syncManager.stop();
    // Clear any revealed passwords
    // NO NAVIGATION - User stays on /vault, just sees unlock screen
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    try {
      // Clear vault state first
      setVault(null);
      setVaultStatus('LOCKED');
      setMasterPassword('');
      setVaultSalt(null);
      setCurrentAccount(null);
      setSessionStartTime(null);
      setRemainingSessionTime(null);
      
      // Stop sync
      syncManager.stop();
      
      // Clear local storage (optional - vault data is encrypted anyway)
      vaultStorage.clearAll().catch((err: any) => {
        console.warn('Failed to clear vault storage:', err);
      });
      
      // Logout from auth context (clears token and user state)
      authLogout();
      
      // Navigate to home page
      navigate('/');
      
      // Show success notification
      showToast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Error during logout:', error);
      // Still try to logout even if there's an error
      authLogout();
      navigate('/');
      showToast.info('Logged out (some data may not have been cleared)');
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  const handleKeyRotationSuccess = () => {
    // After successful key rotation, lock the vault
    // User will need to log in with new password
    handleLock();
    alert('Master key rotated successfully! Please log in with your new password.');
  };

  const handleBreachScan = async () => {
    // Skip if vault is empty or doesn't exist
    if (!vault || !vault.entries || vault.entries.length === 0) {
      return;
    }

    setIsScanningBreaches(true);
    setBreachScanError(null);

    try {
      const passwordCache = new Map<string, number>();
      const updatedEntries: VaultEntry[] = [];

      // Only scan entries that have passwords
      const entriesWithPasswords = vault.entries.filter(entry => entry.password);
      
      // If no entries have passwords, skip scan
      if (entriesWithPasswords.length === 0) {
        setLastBreachScanAt(Date.now());
        return;
      }

      for (const entry of entriesWithPasswords) {
        let breachCount = entry.breachCount ?? null;
        if (entry.password) {
          if (passwordCache.has(entry.password)) {
            breachCount = passwordCache.get(entry.password)!;
          } else {
            try {
            const count = await getPasswordBreachCount(entry.password);
            passwordCache.set(entry.password, count);
            breachCount = count;
            } catch (error) {
              // If individual password check fails, continue with others
              console.warn(`Failed to check breach for entry ${entry.id}:`, error);
              // Keep existing breachCount if available
            }
          }
        }

        updatedEntries.push({
          ...entry,
          breachCount,
          lastBreachCheck: Date.now()
        });
      }

      // Merge with entries that don't have passwords (preserve them)
      const entriesWithoutPasswords = vault.entries.filter(entry => !entry.password);
      const allUpdatedEntries = [...updatedEntries, ...entriesWithoutPasswords];

      const updatedVault = { ...vault, entries: allUpdatedEntries };
      
      // Save to server (non-blocking - don't wait if it fails)
      try {
      await saveVaultToServer(updatedVault, 'UPDATE');
      setVault(updatedVault);
      setLastBreachScanAt(Date.now());
      } catch (saveError) {
        // If save fails, still update local state so user sees results
        console.warn('Failed to save breach scan results to server:', saveError);
        setVault(updatedVault);
        setLastBreachScanAt(Date.now());
      }
    } catch (error) {
      console.error('Breach scan failed:', error);
      setBreachScanError(error instanceof Error ? error.message : 'Failed to run breach scan');
      // Don't throw - allow user to continue using vault
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

  const formatSessionTime = (minutes: number): string => {
    if (minutes <= 0) return '0m';
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes - mins) * 60);
    
    if (mins >= 1) {
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    } else {
      return `${secs}s`;
    }
  };

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
      // Ensure vault storage is initialized
      await vaultStorage.init();
      
      // Get stored vault to get salt, or use salt from state if vault not in storage
      let storedVault = await vaultStorage.getVault();
      let salt: ArrayBuffer;
      
      if (storedVault && storedVault.salt) {
        // Use salt from stored vault
        salt = base64ToArrayBuffer(storedVault.salt);
      } else if (vaultSalt) {
        // Use salt from state (from unlock)
        salt = vaultSalt;
        // Create a stored vault entry for future use
        storedVault = null; // Will be created after encryption
      } else {
        throw new Error('No vault salt available. Please unlock your vault again.');
      }

      // Use the actual master password from state, not hardcoded
      if (!masterPassword) {
        throw new Error('Master password not available. Please unlock your vault again.');
      }
      
      // Encrypt the updated vault
      const vaultJson = JSON.stringify(vaultData);
      const encrypted = await encrypt(vaultJson, masterPassword, salt);
      
      const payload = {
        encryptedVault: arrayBufferToBase64(encrypted.encrypted),
        iv: arrayBufferToBase64(encrypted.iv),
        version: Date.now()
      };

      const performVaultMutation = async () => {
        if (operation === 'CREATE') {
          return apiPost('/api/vault/entry', payload, { requireAuth: true });
        }
        if (operation === 'UPDATE' && entryId) {
          return apiPut(`/api/vault/entry/${entryId}`, payload, { requireAuth: true });
        }
        if (operation === 'UPDATE') {
          return apiPost('/api/vault/save', payload, { requireAuth: true });
        }
        if (operation === 'DELETE' && entryId) {
          return apiDelete(`/api/vault/entry/${entryId}`, { requireAuth: true });
        }
        throw new Error('Invalid operation or missing entryId');
      };

      // New accounts can hit short DB propagation windows.
      let response;
      try {
        response = await performVaultMutation();
      } catch (error: any) {
        if (error?.code === 'USER_NOT_FOUND') {
          await new Promise((resolve) => setTimeout(resolve, 500));
          response = await performVaultMutation();
        } else {
          throw error;
        }
      }

      // Update local storage
      // Use salt from storedVault if available, otherwise convert from ArrayBuffer
      const saltBase64 = storedVault?.salt || arrayBufferToBase64(salt);
      const updatedStoredVault = vaultStorage.createVault(
        payload.encryptedVault,
        payload.iv,
        saltBase64,
        payload.version
      );
      await vaultStorage.storeVault(updatedStoredVault);

      return response;
    } catch (error: any) {
      console.error('Failed to save vault:', error);
      // Provide more detailed error message
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error('Error details:', {
        message: errorMessage,
        operation,
        entryId,
        hasToken: !!localStorage.getItem('safenode_token'),
        hasMasterPassword: !!masterPassword
      });
      throw new Error(errorMessage);
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

    } catch (error: any) {
      console.error('Failed to save entry:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      
      // Handle rate limit errors with user-friendly message
      if (error?.isRateLimit || errorMessage.includes('rate limit')) {
        const retryAfter = error?.retryAfter || 15;
        showToast.error(`Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`);
        return;
      }
      
      console.error('Error details:', {
        message: errorMessage,
        hasToken: !!localStorage.getItem('safenode_token'),
        hasMasterPassword: !!masterPassword,
        vaultStatus
      });
      showToast.error(`Failed to save entry: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };


  const filteredEntries = (isTravelModeEnabled ? [] : (vault?.entries || [])).filter((e) => {
    const matchesQuery = !query.trim() ||
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.username.toLowerCase().includes(query.toLowerCase()) ||
      (e.url?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
      (e.notes?.toLowerCase().includes(query.toLowerCase()) ?? false)
    const matchesTag = !activeTag || (e.tags?.includes(activeTag) ?? false)
    return matchesQuery && matchesTag
  })

  // Calculate tag usage frequency and get top tags
  const tagUsage = (vault?.entries || []).reduce((acc, entry) => {
    (entry.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  const allTags = Object.keys(tagUsage).sort((a, b) => tagUsage[b] - tagUsage[a]);
  const topTags = allTags.slice(0, 5);
  const [showAllTags, setShowAllTags] = useState(false);

  // ============================================================================
  // ARCHITECTURE RULES:
  // 1. App.tsx renders UI based on auth state and vault state
  // 2. React Router handles all navigation via navigate()
  // 3. Route guards (ProtectedRoute/PublicRoute) enforce access control
  // 4. Vault unlock is local state - separate from authentication
  // 5. Use location.pathname to check current route, never maintain duplicate state
  // ============================================================================
  
  // Wait for auth initialization before rendering
  if (!isAuthInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Initializing SafeNode...</p>
        </div>
      </div>
    )
  }
  
  // Not authenticated - show home/auth based on route
  if (!isAuthenticated || !user) {
    const isOnAuthPage = location.pathname === '/auth' || location.pathname.startsWith('/auth');
    if (isOnAuthPage) {
      return (
        <Auth 
          onBackToHome={() => {
            navigate('/');
          }}
          initialMode={authMode}
        />
      )
    }
    return <Home onEnterApp={(mode) => {
      setAuthMode(mode || 'signup');
      navigate('/auth');
    }} />
  }

  // Authenticated user - render based on vault state and route
  // Route guards ensure we're on /vault, /settings, or /billing
  
  // Handle settings and billing routes
  if (location.pathname.startsWith('/settings')) {
    return <SettingsPage />;
  }
  
  if (location.pathname.startsWith('/billing')) {
    return <SubscribePage />;
  }
  
  // Check if user needs to set up master password (only if explicitly triggered)
  // Don't check user.needsMasterPassword as it may be stale - let UnlockVault handle vault existence check
  if (showMasterPasswordSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 flex items-center justify-center p-4">
        <MasterPasswordSetup
          email={user.email}
          onComplete={(vault, masterPassword, salt) => {
            // After master password setup, vault is initialized and unlocked
            if (vault && masterPassword && salt) {
              // Unlock the vault immediately
              handleVaultUnlocked(vault, masterPassword, salt)
            }
            setShowMasterPasswordSetup(false)
            navigate('/vault')
          }}
          onSkip={() => {
            // Allow skipping for now, but vault won't work until master password is set
            setShowMasterPasswordSetup(false)
            navigate('/vault')
          }}
        />
      </div>
    )
  }

  // Authenticated but vault not unlocked
  // Show unlock screen - user must unlock vault to access it
  if (vaultStatus === 'LOCKED') {
    return (
      <UnlockVault 
        onVaultUnlocked={handleVaultUnlocked}
        onSetupMasterPassword={() => {
          setShowMasterPasswordSetup(true)
        }}
        onLogout={() => {
          // Clear vault state and logout
          // NO NAVIGATION - Route guards will redirect after logout
          setVaultStatus('LOCKED')
          setVault(null)
          setMasterPassword('')
          setVaultSalt(null)
          authLogout()
        }}
      />
    )
  }

  const dashboardSidebarItems: SidebarItem[] = [
    {
      id: 'vault',
      label: 'Dashboard',
      description: 'Overview and recent credentials',
      section: 'Operations',
      icon: <span>⌘</span>,
      active: true,
      onClick: () => navigate('/vault')
    },
    {
      id: 'watchtower',
      label: 'Watchtower',
      description: 'Risk, breach, and password posture',
      section: 'Operations',
      icon: <span>🛡</span>,
      onClick: () => setIsWatchtowerOpen(true)
    },
    {
      id: 'passkeys',
      label: 'Passkeys',
      description: 'WebAuthn and biometric access',
      section: 'Security',
      icon: <span>🔑</span>,
      onClick: () => setIsPasskeysOpen(true)
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      description: 'Sessions, blocked devices, events',
      section: 'Security',
      icon: <span>⎘</span>,
      onClick: () => setIsAuditLogsOpen(true)
    },
    {
      id: 'teams',
      label: 'Teams',
      description: 'Shared vaults and org controls',
      section: 'Workspace',
      icon: <span>◫</span>,
      onClick: () => setIsTeamVaultsOpen(true)
    },
    {
      id: 'billing',
      label: 'Billing',
      description: 'Plan limits and upgrade path',
      section: 'Workspace',
      icon: <span>◔</span>,
      onClick: () => navigate('/billing')
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Vault preferences and account',
      section: 'Workspace',
      icon: <span>⚙</span>,
      onClick: () => navigate('/settings')
    }
  ]

  const userName = user?.displayName || user?.email?.split('@')[0] || 'SafeNode Operator'
  const userPlan = user?.subscriptionTier === 'pro' ? 'personal' : user?.subscriptionTier === 'enterprise' ? 'teams' : 'free'
  const sessionCountdownLabel =
    remainingSessionTime !== null && remainingSessionTime > 0 ? formatSessionTime(remainingSessionTime) : 'Secure session active'
  const lastBreachScanLabel = lastBreachScanAt ? formatLastSynced(lastBreachScanAt) : null
  const syncLastSyncedLabel =
    syncState.status === 'syncing'
      ? 'Syncing encrypted changes'
      : syncState.status === 'error' || syncError
        ? 'Sync channel degraded'
        : syncState.lastSyncedAt
          ? formatLastSynced(syncState.lastSyncedAt)
          : 'No remote sync yet'

  return (
    <DashboardLayout
      sidebarItems={dashboardSidebarItems}
      activeSidebarItem="vault"
      sidebarBrand={{
        logo: <Logo variant="header" />,
        title: 'Safenode',
        subtitle: 'Encrypted operations center',
        badge: 'Zero-knowledge'
      }}
      sidebarFooter={{
        title: userName,
        subtitle: user?.email || 'Signed in',
        meta: <span className="capitalize">{userPlan}</span>,
        avatar: <span className="text-sm font-semibold">{userName.slice(0, 2).toUpperCase()}</span>
      }}
      topbarTitle="Dashboard"
      topbarSubtitle="Vault command center"
      topbarSearch={{
        placeholder: 'Search vault...',
        value: query,
        onChange: setQuery
      }}
      topbarLeftContent={
        <div className="flex flex-wrap items-center gap-2">
          <AccountSwitcher
            onAccountChange={(account) => {
              if (currentAccount?.id !== account.id) {
                setCurrentAccount(account);
                handleLock();
              } else {
                setCurrentAccount(account);
              }
            }}
            currentAccountId={currentAccount?.id}
          />
          <Button
            onClick={toggleDarkMode}
            variant="ghost"
            size="sm"
            className="min-h-[42px] rounded-xl px-3"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </Button>
          <Button
            onClick={() => isTravelModeEnabled ? disableTravelMode() : enableTravelMode()}
            variant={isTravelModeEnabled ? 'primary' : 'ghost'}
            size="sm"
            className="min-h-[42px] rounded-xl px-3"
          >
            ✈ Travel Mode
          </Button>
        </div>
      }
      topbarRightContent={
        <div className="flex items-center gap-2">
          <Button onClick={handleAddEntry} size="sm" variant="primary">+ Add</Button>
          <div className="relative more-menu-container">
            <Button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              variant="outline"
              size="sm"
              className="min-h-[42px] rounded-xl px-3"
              title="More actions"
            >
              More
            </Button>
            <AnimatePresence>
              {isMoreMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
                >
                  {[
                    { label: 'Sharing Keys', action: () => setIsSharingKeysOpen(true) },
                    { label: 'Import Entry', action: () => setIsImportOpen(true) },
                    { label: 'Backups', action: () => setIsBackupModalOpen(true) },
                    { label: 'PIN Setup', action: () => setIsPINSetupOpen(true) },
                    { label: 'Biometric Setup', action: () => setIsBiometricSetupOpen(true) },
                    { label: 'Rotate Master Password', action: () => setIsKeyRotationOpen(true) },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.action();
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button onClick={handleLock} size="sm" variant="outline">Lock</Button>
          <Button onClick={handleLogout} size="sm" variant="outline">Logout</Button>
        </div>
      }
    >
      <VaultDashboard
        entries={vault?.entries || []}
        filteredEntries={filteredEntries}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        allTags={allTags}
        topTags={topTags}
        tagUsage={tagUsage}
        showAllTags={showAllTags}
        onToggleShowAllTags={() => setShowAllTags((prev) => !prev)}
        healthSummary={healthSummary}
        isScanningBreaches={isScanningBreaches}
        onRunBreachScan={handleBreachScan}
        breachScanError={breachScanError}
        lastBreachScanLabel={lastBreachScanLabel}
        syncState={{
          status: syncState.status,
          lastSyncedLabel: syncLastSyncedLabel
        }}
        sessionCountdownLabel={sessionCountdownLabel}
        isTravelModeEnabled={isTravelModeEnabled}
        onDisableTravelMode={disableTravelMode}
        onAddEntry={handleAddEntry}
        onOpenWatchtower={() => setIsWatchtowerOpen(true)}
        onOpenPasskeys={() => setIsPasskeysOpen(true)}
        onOpenTeams={() => setIsTeamVaultsOpen(true)}
        onOpenAudit={() => setIsAuditLogsOpen(true)}
        onOpenBilling={() => navigate('/billing')}
        onOpenSettings={() => navigate('/settings')}
        onOpenPasswordGenerator={() => setIsPasswordGeneratorOpen(true)}
        onStrengthenPasswords={() => setIsStrengthenPasswordsOpen(true)}
        onSelectEntry={setSelectedEntryDetail}
        onCopyPassword={(entry) => {
          enhancedCopyToClipboard(entry.password);
          showToast.success(`Password copied for ${entry.name}`);
        }}
        onShare={setShareEntry}
        onEdit={handleEditEntry}
        userName={userName}
        userEmail={user?.email || 'signed-in account'}
        userPlan={userPlan}
        passkeySupported={passkeySupported}
      />

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
      
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                <Logout className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confirm Logout</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Are you sure you want to log out?</p>
              </div>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>You will be logged out and must sign in again.</strong>
              </p>
              <ul className="mt-2 text-xs text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                <li>Your vault will remain encrypted on this device</li>
                <li>Biometric unlock will need to be re-enabled after login</li>
                <li>You'll need to enter your master password to unlock</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowLogoutConfirm(false)}
                variant="outline"
                size="md"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmLogout}
                variant="primary"
                size="md"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Logout
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
      <EntryDetailModal
        entry={selectedEntryDetail}
        isOpen={!!selectedEntryDetail}
        onClose={() => setSelectedEntryDetail(null)}
        onCopyPassword={(password) => {
          enhancedCopyToClipboard(password);
          showToast.success('Password copied to clipboard');
        }}
        onEdit={() => {
          if (selectedEntryDetail) {
            handleEditEntry(selectedEntryDetail);
            setSelectedEntryDetail(null);
          }
        }}
        onDelete={() => {
          if (selectedEntryDetail) {
            handleDeleteEntry(selectedEntryDetail.id);
            setSelectedEntryDetail(null);
          }
        }}
        onShare={() => {
          if (selectedEntryDetail) {
            setShareEntry(selectedEntryDetail);
            setSelectedEntryDetail(null);
          }
        }}
      />
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
      
      {/* New Feature Modals */}
      <AuditLogsModal
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
        masterPassword={masterPassword}
        salt={vaultSalt || new Uint8Array(32).buffer}
        accountId={currentAccount?.id}
      />
      <TeamVaultsModal
        isOpen={isTeamVaultsOpen}
        onClose={() => setIsTeamVaultsOpen(false)}
        currentUserId={user?.email || 'demo@safe-node.app'}
      />
      <PINSetupModal
        isOpen={isPINSetupOpen}
        onClose={() => setIsPINSetupOpen(false)}
        masterPassword={masterPassword}
        salt={vaultSalt || new Uint8Array(32).buffer}
        onSuccess={() => {
          // PIN setup successful
        }}
      />
      <BiometricSetupModal
        isOpen={isBiometricSetupOpen}
        onClose={() => setIsBiometricSetupOpen(false)}
        userId={user?.email || 'demo@safe-node.app'}
        userName={user?.email || 'Demo User'}
        onSuccess={() => {
          // Biometric setup successful
        }}
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

      {/* Password Generator Modal */}
      <PasswordGeneratorModal
        isOpen={isPasswordGeneratorOpen}
        onClose={() => setIsPasswordGeneratorOpen(false)}
        onGenerate={(password) => {
          // Copy password to clipboard
          enhancedCopyToClipboard(password);
          showToast.success('Password generated and copied to clipboard!');
        }}
      />

      {/* Strengthen Passwords Modal */}
      <StrengthenPasswordsModal
        isOpen={isStrengthenPasswordsOpen}
        onClose={() => setIsStrengthenPasswordsOpen(false)}
        entries={vault?.entries || []}
        onUpdatePassword={async (entryId, newPassword) => {
          try {
            if (!vault) throw new Error('No vault available');
            
            // Find the entry
            const entry = vault.entries.find(e => e.id === entryId);
            if (!entry) throw new Error('Entry not found');

            // Update the entry with new password
            const updatedEntry = {
              ...entry,
              password: newPassword,
              passwordUpdatedAt: Date.now()
            };

            // Update vault
            const updatedVault = {
              ...vault,
              entries: vault.entries.map(e => e.id === entryId ? updatedEntry : e)
            };

            // Save to server
            await saveVaultToServer(updatedVault, 'UPDATE', entryId);
            
            // Update local state
            setVault(updatedVault);
            
            showToast.success(`Password updated for ${entry.name}`);
          } catch (error: any) {
            console.error('Failed to update password:', error);
            showToast.error(`Failed to update password: ${error?.message || 'Unknown error'}`);
            throw error;
          }
        }}
      />

      {/* Toast notifications are now handled globally by ToastProvider in main.tsx */}
    </DashboardLayout>
  );
};

export default App;
 
// Entry Detail Modal Component
interface EntryDetailModalProps {
  entry: VaultEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onCopyPassword: (password: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry, 
  isOpen,
  onClose,
  onCopyPassword, 
  onEdit, 
  onDelete, 
  onShare
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [revealTimeout, setRevealTimeout] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const PASSWORD_REVEAL_TIMEOUT = 30; // 30 seconds

  useEffect(() => {
    if (!isOpen) {
      setShowPassword(false);
      setCopyFeedback(false);
      if (revealTimeout) {
        clearTimeout(revealTimeout);
        setRevealTimeout(null);
      }
      setTimeRemaining(null);
    }
  }, [isOpen, revealTimeout]);

  // Password reveal timeout countdown
  useEffect(() => {
    if (showPassword && isOpen) {
      setTimeRemaining(PASSWORD_REVEAL_TIMEOUT);
      
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setShowPassword(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      const timeout = window.setTimeout(() => {
        setShowPassword(false);
        setTimeRemaining(null);
        clearInterval(interval);
      }, PASSWORD_REVEAL_TIMEOUT * 1000);

      setRevealTimeout(timeout);

      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    } else {
      if (revealTimeout) {
        clearTimeout(revealTimeout);
        setRevealTimeout(null);
      }
      setTimeRemaining(null);
    }
  }, [showPassword, isOpen]);

  if (!entry) return null;

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
        return 'from-secondary-500 to-secondary-400';
    }
  };

  const handleCopyPassword = () => {
    onCopyPassword(entry.password);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && entry && (
        <>
    <motion.div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="fixed inset-0 z-[81] flex items-center justify-center p-3 sm:p-4"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-detail-title"
          >
          <motion.div 
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-w-lg w-full max-h-[85vh] shadow-xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              layoutId={`entry-${entry.id}`}
            >
              {/* Compact Header */}
              <div className={`relative px-4 py-3 bg-gradient-to-r ${getCategoryColor(entry.category)} text-white`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
            {entry.category ? (
              <div className="text-white">
                {getCategoryIcon(entry.category)}
              </div>
            ) : (
                        <span className="text-white font-semibold text-lg">
                {entry.name.charAt(0).toUpperCase()}
              </span>
            )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2
                        id="entry-detail-title"
                        className="text-lg font-semibold truncate"
                      >
                        {entry.name}
                      </h2>
              {entry.category && (
                        <span className="text-xs text-white/80">
                  {entry.category}
                </span>
              )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
            </div>
            
              {/* Compact Content */}
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {/* Username */}
                {entry.username && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      Username / Email
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm text-slate-900 dark:text-slate-100 truncate">{entry.username}</span>
                    </div>
                  </div>
                )}

                {/* Password */}
                {entry.password && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      Password
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={entry.password}
                  readOnly
                          className="w-full px-3 py-2 pr-20 text-sm font-mono bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5">
                          {showPassword && timeRemaining !== null && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              {timeRemaining}s
                            </span>
                          )}
                          <button
                            type="button"
                  onClick={() => setShowPassword(!showPassword)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors touch-manipulation"
                            title={showPassword ? `Hide password (auto-hides in ${timeRemaining}s)` : 'Show password (auto-hides after 30s)'}
                >
                  {showPassword ? (
                              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                          </button>
              </div>
            </div>
                      <button
                        onClick={handleCopyPassword}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all touch-manipulation min-h-[36px] ${
                          copyFeedback 
                            ? 'bg-secondary-500 text-white' 
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {copyFeedback ? (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* URL */}
                {entry.url && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      Website URL
                    </label>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <svg className="w-4 h-4 text-secondary-600 dark:text-secondary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="text-sm text-secondary-600 dark:text-secondary-400 group-hover:text-secondary-700 dark:group-hover:text-secondary-300 truncate flex-1">
                        {entry.url}
                      </span>
                      <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-secondary-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      Secure Notes
                    </label>
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {entry.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                </div>
              </div>
            )}
        </div>

              {/* Compact Footer Actions */}
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onEdit}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors touch-manipulation flex items-center gap-1.5 min-h-[36px]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                    Edit
                  </button>
                  <button
            onClick={onShare}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors touch-manipulation flex items-center gap-1.5 min-h-[36px]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
                  </button>
                </div>
                <button
            onClick={onDelete}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation flex items-center gap-1.5 min-h-[36px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
 
// Enhanced Entry Card Component with Beautiful Animations
interface EntryCardProps {
  entry: VaultEntry;
  index: number;
  onClick: () => void;
  onCopyPassword: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSaving: boolean;
  variants?: any;
}

const EntryCard = React.forwardRef<HTMLDivElement, EntryCardProps>(({ 
  entry, 
  index, 
  onClick,
  onCopyPassword, 
  onShare, 
  onEdit,
  onDelete, 
  isSaving, 
  variants 
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);
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

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'credit card':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'identity':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'secure note':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        return 'from-secondary-500 to-secondary-400';
    }
  };

  return (
            <motion.div
      ref={ref}
      className="group relative cursor-pointer"
      variants={variants}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? {} : { opacity: 0 }}
      transition={{ 
        delay: prefersReducedMotion ? 0 : index * 0.02,
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1]
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      layout
    >
      <motion.div 
        className="relative p-2.5 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-150"
        whileHover={prefersReducedMotion ? {} : { 
          y: -1,
          transition: { duration: 0.15 }
        }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="relative flex items-center gap-2.5">
          {/* Minimal Icon */}
          <div 
            className={`flex-shrink-0 w-8 h-8 bg-gradient-to-br ${getCategoryColor(entry.category)} rounded-md flex items-center justify-center shadow-sm`}
          >
            {entry.category ? (
              <div className="text-white">
                {getCategoryIcon(entry.category)}
              </div>
            ) : (
              <span className="text-white font-medium text-xs">
                {entry.name.charAt(0).toUpperCase()}
              </span>
            )}
      </div>

          {/* Clean Entry Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate leading-tight">
                {entry.name}
              </h3>
            </div>

            {/* Minimal metadata */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {entry.username && (
                <span className="truncate max-w-[140px]">
                  {entry.username}
                </span>
              )}
              {entry.url && (
                <span className="text-slate-400 dark:text-slate-500 truncate max-w-[120px] hidden sm:inline">
                  {entry.url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0].substring(0, 20)}
                </span>
              )}
            </div>

            {/* Minimal tags - only show if exists */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {entry.tags.slice(0, 1).map(tag => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
                {entry.tags.length > 1 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    +{entry.tags.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Minimal chevron - only on hover */}
        <motion.div
            className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
            animate={{ x: isHovered ? 1 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
});

function TotpBadge({ secret }: { secret: string }) {
  const [code, setCode] = React.useState<string>('------')
  const [remaining, setRemaining] = React.useState<number>(30 - (Math.floor(Date.now()/1000) % 30))

  React.useEffect(() => {
    let mounted = true
    const update = async () => {
      try {
        const newCode = await generateTotpCode(secret)
        if (mounted) setCode(newCode)
      } catch (error) {
        // Silently handle TOTP generation errors
        console.error('TOTP generation error:', error)
      }
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
