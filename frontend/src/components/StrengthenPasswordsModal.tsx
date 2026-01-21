import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSecurePassword, type PasswordGeneratorOptions } from '../crypto/crypto';
import type { VaultEntry } from '../types/vault';

interface StrengthenPasswordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: VaultEntry[];
  onUpdatePassword: (entryId: string, newPassword: string) => Promise<void>;
}

interface WeakPasswordEntry {
  entry: VaultEntry;
  score: number;
  issues: string[];
  newPassword?: string;
  isGenerating?: boolean;
}

function scorePasswordStrength(password: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;
  
  if (password.length >= 12) score += 1;
  else issues.push('Use at least 12 characters');
  
  if (/[a-z]/.test(password)) score += 1;
  else issues.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else issues.push('Add uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else issues.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else issues.push('Add special characters');
  
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    issues.push('Avoid repeated characters');
  }
  
  return { score: Math.max(0, Math.min(5, score)), issues };
}

const StrengthenPasswordsModal: React.FC<StrengthenPasswordsModalProps> = ({
  isOpen,
  onClose,
  entries,
  onUpdatePassword
}) => {
  const [weakEntries, setWeakEntries] = useState<WeakPasswordEntry[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [generatedPasswords, setGeneratedPasswords] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (isOpen && entries.length > 0) {
      const weak = entries
        .map(entry => ({
          entry,
          ...scorePasswordStrength(entry.password)
        }))
        .filter(item => item.score < 4)
        .sort((a, b) => a.score - b.score); // Sort by weakest first
      
      setWeakEntries(weak);
      setGeneratedPasswords(new Map());
    }
  }, [isOpen, entries]);

  const handleGeneratePassword = async (entryId: string) => {
    const entry = weakEntries.find(we => we.entry.id === entryId);
    if (!entry) return;

    setWeakEntries(prev => prev.map(we => 
      we.entry.id === entryId ? { ...we, isGenerating: true } : we
    ));

    try {
      const options: PasswordGeneratorOptions = {
        length: 20,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: false,
        excludeAmbiguous: false,
        customExclude: '',
        requireEachType: true
      };

      const newPassword = await generateSecurePassword(20, options);
      setGeneratedPasswords(prev => new Map(prev).set(entryId, newPassword));
      
      setWeakEntries(prev => prev.map(we => 
        we.entry.id === entryId ? { ...we, newPassword, isGenerating: false } : we
      ));
    } catch (error) {
      console.error('Failed to generate password:', error);
      setWeakEntries(prev => prev.map(we => 
        we.entry.id === entryId ? { ...we, isGenerating: false } : we
      ));
    }
  };

  const handleUpdatePassword = async (entryId: string) => {
    const newPassword = generatedPasswords.get(entryId);
    if (!newPassword) return;

    setUpdatingIds(prev => new Set(prev).add(entryId));
    try {
      await onUpdatePassword(entryId, newPassword);
      // Remove from weak entries list after successful update
      setWeakEntries(prev => prev.filter(we => we.entry.id !== entryId));
      setGeneratedPasswords(prev => {
        const next = new Map(prev);
        next.delete(entryId);
        return next;
      });
    } catch (error) {
      console.error('Failed to update password:', error);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const handleCopyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
  };

  const getStrengthColor = (score: number) => {
    if (score < 2) return 'bg-red-500';
    if (score < 4) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = (score: number) => {
    if (score < 2) return 'Very Weak';
    if (score < 3) return 'Weak';
    if (score < 4) return 'Fair';
    return 'Strong';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[71] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="strengthen-passwords-title"
          >
            <div 
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[85vh] shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 id="strengthen-passwords-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                      Strengthen Weak Passwords
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {weakEntries.length} password{weakEntries.length !== 1 ? 's' : ''} need attention
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Close dialog"
                >
                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-600">
                      Review and strengthen weak passwords in your vault.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {weakEntries.length} password{weakEntries.length !== 1 ? 's' : ''} need{weakEntries.length === 1 ? 's' : ''} attention
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-[420px] overflow-y-auto">
                  {weakEntries.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No weak passwords detected. Great work!</div>
                  ) : (
                    weakEntries.map((weakEntry) => {
                      const { entry, score, issues } = weakEntry;
                      const newPassword = generatedPasswords.get(entry.id);
                      const isUpdating = updatingIds.has(entry.id);

                      return (
                        <div key={entry.id} className="p-4 bg-white flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                score < 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {getStrengthLabel(score)}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800">{entry.name}</p>
                            <p className="text-xs text-slate-600 mt-1">{entry.username}</p>
                            {issues.length > 0 && (
                              <p className="text-xs text-slate-500 mt-1">
                                {issues.slice(0, 2).join(', ')}{issues.length > 2 ? ` +${issues.length - 2} more` : ''}
                              </p>
                            )}
                            {newPassword && (
                              <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 text-xs font-mono text-slate-900 truncate">
                                    {newPassword}
                                  </code>
                                  <button
                                    onClick={() => newPassword && handleCopyPassword(newPassword)}
                                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                                    title="Copy password"
                                  >
                                    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {!newPassword ? (
                              <button
                                onClick={() => handleGeneratePassword(entry.id)}
                                disabled={weakEntry.isGenerating}
                                className="btn btn-sm btn-primary"
                              >
                                {weakEntry.isGenerating ? 'Generating…' : 'Generate'}
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleGeneratePassword(entry.id)}
                                  disabled={weakEntry.isGenerating}
                                  className="btn btn-sm btn-outline"
                                >
                                  Regenerate
                                </button>
                                <button
                                  onClick={() => handleUpdatePassword(entry.id)}
                                  disabled={isUpdating}
                                  className="btn btn-sm btn-primary"
                                >
                                  {isUpdating ? 'Updating…' : 'Update'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StrengthenPasswordsModal;
