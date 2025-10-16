import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { encrypt, decrypt, arrayBufferToBase64, base64ToArrayBuffer } from '../crypto/crypto';
import { vaultStorage } from '../storage/vaultStorage';
import { vaultSync } from '../sync/vaultSync';

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
  onVaultUnlocked: (vault: VaultData) => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const prefersReducedMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your master password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Initialize storage
      await vaultStorage.init();

      // Step 1: Try to sync vault (will use local if offline)
      setSyncStatus('syncing');
      const syncResult = await vaultSync.syncVault();
      
      if (!syncResult.success || !syncResult.vault) {
        throw new Error(syncResult.error || 'Failed to sync vault');
      }

      // Update sync status based on result
      setSyncStatus(vaultStorage.isOnline() ? 'online' : 'offline');

      const storedVault = syncResult.vault;

      // Step 2: Get salt (try stored first, then fetch from server)
      let salt: ArrayBuffer;
      
      if (storedVault.salt) {
        salt = base64ToArrayBuffer(storedVault.salt);
      } else {
        // Fetch salt from server
        const saltResponse = await fetch('/api/user/salt');
        if (!saltResponse.ok) {
          throw new Error('Failed to fetch salt from server');
        }
        const saltData: BackendSaltResponse = await saltResponse.json();
        salt = base64ToArrayBuffer(saltData.salt);
        
        // Update stored vault with salt
        const updatedVault = { ...storedVault, salt: saltData.salt };
        await vaultStorage.storeVault(updatedVault);
      }

      // Step 3: Convert stored vault data back to ArrayBuffers
      const encryptedVault = base64ToArrayBuffer(storedVault.encryptedVault);
      const iv = base64ToArrayBuffer(storedVault.iv);

      // Step 4: Decrypt the vault
      const decryptedJson = await decrypt(
        { encrypted: encryptedVault, iv, salt },
        password
      );

      // Step 5: Parse and validate the decrypted data
      const vault: VaultData = JSON.parse(decryptedJson);
      
      // Validate vault structure
      if (!vault.entries || !Array.isArray(vault.entries)) {
        throw new Error('Invalid vault data structure');
      }

      // Success! Pass the unlocked vault to parent
      onVaultUnlocked(vault);

    } catch (err) {
      console.error('Unlock failed:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to unlock vault. Please check your password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  const cardVariants = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
  }

  const pulseVariants = prefersReducedMotion ? undefined : {
    animate: {
      boxShadow: [
        '0 0 0 0 rgba(168,85,247,0.35)',
        '0 0 0 14px rgba(168,85,247,0.0)'
      ],
      transition: { duration: 2, repeat: Infinity }
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mb-4"
            variants={pulseVariants}
            animate={prefersReducedMotion ? undefined : 'animate'}
            aria-hidden
          >
            <motion.svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={prefersReducedMotion ? undefined : { rotate: -8, opacity: 0 }}
              animate={prefersReducedMotion ? undefined : { rotate: 0, opacity: 1, transition: { duration: 0.5 } }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </motion.svg>
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Unlock your vault</h1>
          <p className="text-slate-600">Enter your master password to access your passwords</p>
        </div>

        {/* Unlock Form */}
        <motion.div
          className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          role="region"
          aria-label="Unlock SafeNode Vault"
        >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-slate-700">
                Master Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  placeholder="Enter your master password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'unlock-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-md"
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
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                id="unlock-error"
                className="bg-red-50 border border-red-200 rounded-xl p-4"
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                role="alert"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full btn btn-md btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" aria-hidden></div>
                  <span>Unlocking...</span>
                </div>
              ) : (
                'Unlock Vault'
              )}
            </motion.button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-center space-x-2 text-slate-500 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Your data is encrypted locally</span>
            </div>
            <div className="mt-2 flex items-center justify-center space-x-2 text-xs text-slate-400">
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
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>SafeNode v0.1.0 • Secure Password Management</p>
        </div>
      </motion.div>
    </div>
  );
};

export default UnlockVault;