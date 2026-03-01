import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { encrypt, decrypt, arrayBufferToBase64, base64ToArrayBuffer } from '../crypto/crypto';
import { vaultStorage } from '../storage/vaultStorage';
import { vaultSync } from '../sync/vaultSync';
import { pinManager } from '../utils/pinManager';
import { auditLogStorage } from '../storage/auditLogs';
import { biometricAuthService, type BiometricCapabilities } from '../utils/biometricAuth';
import { keychainService } from '../utils/keychain';
import { API_BASE } from '../config/api';
import { getCurrentDeviceHeaders } from '../services/deviceService';
import Logo from './Logo';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface VaultData {
  entries: Array<{
    id: string;
    name: string;
    username: string;
    password: string;
    url?: string;
    notes?: string;
  }>;
}

interface UnlockVaultProps {
  onVaultUnlocked: (vault: VaultData, masterPassword: string, salt: ArrayBuffer) => void;
}

interface BackendSaltResponse {
  salt: string; // base64 encoded
}

interface BackendVaultResponse {
  encryptedVault: string; // base64 encoded
  iv: string; // base64 encoded
}

const UnlockVault: React.FC<UnlockVaultProps> = ({ onVaultUnlocked }) => {
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const [unlockMode, setUnlockMode] = useState<'password' | 'pin' | 'both' | 'biometric'>('password');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [salt, setSalt] = useState<ArrayBuffer | null>(null);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    pinManager.init().then(() => {
      setPinEnabled(pinManager.isEnabled());
      if (pinManager.isLockedOut()) {
        const remaining = pinManager.getLockoutRemaining();
        setError(`PIN is locked. Try again in ${remaining} minute(s).`);
      }
    });

    // Check biometric availability
    biometricAuthService.isAvailable().then(caps => {
      setBiometricCapabilities(caps);
      // Check if biometric is enabled in localStorage
      const enabled = localStorage.getItem('safenode_biometric_enabled') === 'true';
      setBiometricEnabled(enabled && caps.available);
    });
  }, []);

  const handleBiometricUnlock = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get user ID for ML analysis (in real app, get from auth context)
      // For now, use a demo user ID - in production, get from auth state
      const userId = 'demo@safe-node.app';
      
      // Authenticate with ML enhancements enabled
      const result = await biometricAuthService.authenticate('Unlock SafeNode vault', {
        enableML: true, // Enable ML-based security features
        userId: userId,
        collectBehavioral: true // Collect behavioral biometrics
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Biometric authentication failed');
      }

      // Log ML analysis results if available
      if (result.mlResult) {
        console.log('ML Analysis:', {
          confidence: result.mlResult.confidence,
          livenessScore: result.mlResult.livenessScore,
          spoofingRisk: result.mlResult.spoofingRisk,
          isAuthentic: result.mlResult.isAuthentic
        });
      }

      // For biometric unlock, we need to get the master password from keychain
      // or use a stored credential
      const storedPassword = await keychainService.get('safenode', 'master_password');
      if (!storedPassword) {
        throw new Error('Master password not found. Please unlock with password first.');
      }

      // Continue with normal unlock flow using stored password
      await performUnlock(storedPassword, null);
    } catch (err) {
      console.error('Biometric unlock failed:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Biometric authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const performUnlock = async (passwordToUse: string, pinToUse: string | null) => {
    console.log('[UnlockVault] performUnlock called');
    
    // Initialize storage
    await vaultStorage.init();
    console.log('[UnlockVault] Storage initialized');

    // Step 1: Try to sync vault (will use local if offline)
    setSyncStatus('syncing');
    console.log('[UnlockVault] Attempting to sync vault...');
    const syncResult = await vaultSync.syncVault();
    console.log('[UnlockVault] Sync result:', { success: syncResult.success, hasVault: !!syncResult.vault, error: syncResult.error });
    
    let storedVault = syncResult.vault;
    let vault: VaultData;
    let saltBuffer: ArrayBuffer;
    let isNewVault = false;

    // If no vault exists (new user), create an empty one
    if (!syncResult.success || !storedVault) {
      console.log('[UnlockVault] No vault found, creating new empty vault...');
      isNewVault = true;
      
      // Get or create salt
      try {
        const token = localStorage.getItem('safenode_token');
        if (token) {
          const saltResponse = await fetch(`${API_BASE}/api/auth/vault/salt`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              ...getCurrentDeviceHeaders()
            },
            credentials: 'include'
          });
        if (saltResponse.ok) {
          const saltData: BackendSaltResponse = await saltResponse.json();
          saltBuffer = base64ToArrayBuffer(saltData.salt);
        } else {
          // Generate salt locally if server fails
            saltBuffer = crypto.getRandomValues(new Uint8Array(32)).buffer;
          }
        } else {
          // Generate salt locally if not authenticated
          saltBuffer = crypto.getRandomValues(new Uint8Array(32)).buffer;
        }
      } catch (error) {
        console.warn('[UnlockVault] Failed to fetch salt, generating locally:', error);
        saltBuffer = crypto.getRandomValues(new Uint8Array(32)).buffer;
      }

      // Create empty vault - no need to encrypt/decrypt, just use it directly
      vault = { entries: [] };
      
      // Still encrypt and store it for future use
      const vaultJson = JSON.stringify(vault);
      const encryptedResult = await encrypt(vaultJson, passwordToUse, saltBuffer);

      storedVault = vaultStorage.createVault(
        arrayBufferToBase64(encryptedResult.encrypted),
        arrayBufferToBase64(encryptedResult.iv),
        arrayBufferToBase64(saltBuffer),
        Date.now()
      );

      await vaultStorage.storeVault(storedVault);
      console.log('[UnlockVault] New empty vault created and stored');
    } else {
      // Existing vault - need to decrypt it
      // Update sync status based on result
      setSyncStatus(vaultStorage.isOnline() ? 'online' : 'offline');

      // Step 2: Get salt
      if (storedVault.salt) {
        saltBuffer = base64ToArrayBuffer(storedVault.salt);
      } else {
        const token = localStorage.getItem('safenode_token');
        if (!token) {
          throw new Error('Not authenticated');
        }
        const saltResponse = await fetch(`${API_BASE}/api/auth/vault/salt`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...getCurrentDeviceHeaders()
          },
          credentials: 'include'
        });
        if (!saltResponse.ok) {
          throw new Error('Failed to fetch salt from server');
        }
        const saltData: BackendSaltResponse = await saltResponse.json();
        saltBuffer = base64ToArrayBuffer(saltData.salt);
        
        const updatedVault = { ...storedVault, salt: saltData.salt };
        await vaultStorage.storeVault(updatedVault);
      }

      setSalt(saltBuffer);

      // Step 3: Verify PIN if required
      if (pinToUse && (unlockMode === 'pin' || unlockMode === 'both')) {
        if (!pinEnabled) {
          throw new Error('PIN is not enabled');
        }
        await pinManager.verifyPIN(pinToUse, passwordToUse, saltBuffer);
      }

      // Step 4: Decrypt the vault
      const encryptedVault = base64ToArrayBuffer(storedVault.encryptedVault);
      const iv = base64ToArrayBuffer(storedVault.iv);

      const decryptedJson = await decrypt(
        { encrypted: encryptedVault, iv, salt: saltBuffer },
        passwordToUse
      );

      vault = JSON.parse(decryptedJson);
      
      if (!vault.entries || !Array.isArray(vault.entries)) {
        throw new Error('Invalid vault data structure');
      }
    }

    // Set salt for new vaults too
    if (isNewVault) {
      setSalt(saltBuffer);
      setSyncStatus(vaultStorage.isOnline() ? 'online' : 'offline');
    }

    // Log successful unlock
    try {
      await auditLogStorage.init(passwordToUse, saltBuffer);
      const eventType = unlockMode === 'biometric' ? 'biometric_unlock' :
                       unlockMode === 'pin' || unlockMode === 'both' ? 'multi_factor_unlock' : 'vault_unlock';
      const action = unlockMode === 'biometric' ? `Unlocked with ${biometricAuthService.getPlatformName()}` :
                    unlockMode === 'both' ? 'Unlocked with password + PIN' :
                    unlockMode === 'pin' ? 'Unlocked with PIN' : 'Unlocked with password';
      await auditLogStorage.logEvent(eventType, action, { success: true });
    } catch {}

    // Pass vault, password, and salt to parent
    console.log('[UnlockVault] Calling onVaultUnlocked with vault:', vault);
    onVaultUnlocked(vault, passwordToUse, saltBuffer);
    console.log('[UnlockVault] onVaultUnlocked called successfully');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[UnlockVault] Form submitted!', { unlockMode, hasPassword: !!password, hasPin: !!pin });
    
    // Validate inputs based on unlock mode
    if (unlockMode === 'both') {
      if (!password.trim() || !pin.trim()) {
        console.log('[UnlockVault] Validation failed: missing password or PIN');
        setError('Please enter both master password and PIN');
        return;
      }
    } else if (unlockMode === 'pin') {
      if (!pin.trim()) {
        console.log('[UnlockVault] Validation failed: missing PIN');
        setError('Please enter your PIN');
        return;
      }
    } else if (unlockMode === 'biometric') {
      console.log('[UnlockVault] Using biometric unlock');
      await handleBiometricUnlock();
      return;
    } else {
      if (!password.trim()) {
        console.log('[UnlockVault] Validation failed: missing password');
        setError('Please enter your master password');
        return;
      }
    }

    console.log('[UnlockVault] Validation passed, starting unlock...');
    setIsLoading(true);
    setError(null);

    try {
      console.log('[UnlockVault] Starting unlock process...');
      await performUnlock(password, unlockMode === 'pin' || unlockMode === 'both' ? pin : null);
      console.log('[UnlockVault] Unlock process completed successfully');
    } catch (err) {
      console.error('[UnlockVault] Unlock failed:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to unlock vault. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants for vault unlock
  const containerVariants = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        duration: 0.6
      } 
    }
  }

  const cardVariants = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
        delay: 0.1
      } 
    }
  }

  const logoVariants = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, scale: 0.8, rotate: -10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: "spring" as const,
        stiffness: 200,
        damping: 15,
        delay: 0.2
      } 
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Logo/Header */}
        <motion.div 
          className="text-center mb-8"
          variants={logoVariants}
          initial="hidden"
          animate="visible"
        >
          <Logo variant="unlock" className="mx-auto mb-4" />
          <motion.h1 
            className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            Unlock your vault
          </motion.h1>
          <motion.p 
            className="text-slate-600 dark:text-slate-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            Enter your master password to access your passwords
          </motion.p>
        </motion.div>

        {/* Unlock Form */}
        <Card
          className="p-6"
          padding="none"
        >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Unlock Mode Toggle */}
            {(pinEnabled || biometricCapabilities?.available) && (
              <div className="flex gap-2 mb-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => setUnlockMode('password')}
                  className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    unlockMode === 'password'
                      ? 'bg-secondary-600 dark:bg-secondary-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  Password
                </button>
                {pinEnabled && (
                  <button
                    type="button"
                    onClick={() => setUnlockMode('both')}
                    className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      unlockMode === 'both'
                        ? 'bg-secondary-600 dark:bg-secondary-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    Password + PIN
                  </button>
                )}
                {biometricCapabilities?.available && (
                  <button
                    type="button"
                    onClick={() => setUnlockMode('biometric')}
                    className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      unlockMode === 'biometric'
                        ? 'bg-secondary-600 dark:bg-secondary-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {biometricCapabilities.type === 'face' ? '👤 Face' : '👆 Biometric'}
                  </button>
                )}
              </div>
            )}

            {/* Password Input */}
            <AnimatePresence mode="wait">
              {(unlockMode === 'password' || unlockMode === 'both') && (
                <motion.div
                  key="password-input"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Master Password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      console.log('[UnlockVault] Password changed, length:', e.target.value.length);
                      setPassword(e.target.value);
                    }}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        console.log('[UnlockVault] Enter key pressed in password field');
                        e.preventDefault();
                        handleSubmit(e as any);
                      }
                    }}
                    placeholder="Enter your master password"
                    disabled={isLoading}
                    autoComplete="current-password"
                    error={error ? undefined : undefined}
                    aria-describedby={error ? 'unlock-error' : undefined}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        disabled={isLoading}
                        aria-pressed={showPassword}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* PIN Input */}
            <AnimatePresence mode="wait">
              {(unlockMode === 'pin' || unlockMode === 'both') && pinEnabled && (
                <motion.div
                  key="pin-input"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Input
                    id="pin"
                    type="password"
                    label="PIN"
                    value={pin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter your PIN"
                    disabled={isLoading}
                    maxLength={8}
                    error={pinManager.isLockedOut() ? `PIN locked. Try again in ${pinManager.getLockoutRemaining()} minute(s).` : undefined}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <motion.div
                id="unlock-error"
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                role="alert"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            {unlockMode === 'biometric' ? (
              <Button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={isLoading || !biometricCapabilities?.available}
                variant="primary"
                size="lg"
                className="w-full"
                loading={isLoading}
              >
                {!isLoading && (
                  <>
                    <span>{biometricCapabilities?.type === 'face' ? '👤' : '👆'}</span>
                    <span>Unlock with {biometricAuthService.getPlatformName()}</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  console.log('[UnlockVault] Submit button clicked!', { password: password ? '***' : '', unlockMode });
                }}
                disabled={isLoading || (unlockMode === 'password' && !password.trim()) || (unlockMode === 'both' && (!password.trim() || !pin.trim()))}
                variant="primary"
                size="lg"
                className="w-full"
                loading={isLoading}
              >
                {!isLoading && 'Unlock Vault'}
              </Button>
            )}
          </form>
        </Card>

        {/* Additional Info */}
        <motion.div 
          className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
            <div className="flex items-center justify-center space-x-2 text-slate-500 dark:text-slate-400 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your data is encrypted locally</span>
            </div>
            <div className="mt-2 flex items-center justify-center space-x-2 text-xs text-slate-400 dark:text-slate-500">
              {syncStatus === 'online' && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Online • Synced</span>
                </>
              )}
              {syncStatus === 'offline' && (
                <>
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Offline • Local vault</span>
                </>
              )}
              {syncStatus === 'syncing' && (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Syncing...</span>
                </>
              )}
            </div>
          </motion.div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 dark:text-slate-400 text-sm">
          <p>SafeNode v0.1.0 • Secure Password Management</p>
        </div>
      </motion.div>
    </div>
  );
};

export default UnlockVault;
