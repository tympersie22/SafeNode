import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { generateSecurePassword, getPasswordBreachCount } from '../crypto/crypto';

export interface VaultEntry {
  id: string;
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  tags?: string[];
  category?: string;
  totpSecret?: string;
}

interface EntryFormProps {
  entry?: VaultEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: VaultEntry) => void;
  categories?: string[];
}

const EntryForm: React.FC<EntryFormProps> = ({ 
  entry, 
  isOpen, 
  onClose, 
  onSave, 
  categories = ['Login', 'Secure Note', 'Credit Card', 'Identity'] 
}) => {
  const [formData, setFormData] = useState<VaultEntry>({
    id: '',
    name: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    tags: [],
    category: 'Login',
    totpSecret: ''
  });
  
  const [tagInput, setTagInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [breachCount, setBreachCount] = useState<number | null>(null);
  const [checkingBreach, setCheckingBreach] = useState(false);

  // Reset form when entry changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setFormData({
          id: entry.id,
          name: entry.name || '',
          username: entry.username || '',
          password: entry.password || '',
          url: entry.url || '',
          notes: entry.notes || '',
          tags: entry.tags || [],
          category: entry.category || 'Login',
          totpSecret: entry.totpSecret || ''
        });
      } else {
        setFormData({
          id: '',
          name: '',
          username: '',
          password: '',
          url: '',
          notes: '',
          tags: [],
          category: 'Login',
          totpSecret: ''
        });
      }
      setTagInput('');
      setShowPassword(false);
    }
  }, [isOpen, entry]);

  const handleInputChange = (field: keyof VaultEntry, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Debounced breach check on password change
  useEffect(() => {
    const pwd = formData.password
    if (!pwd) {
      setBreachCount(null)
      return
    }
    const handle = setTimeout(async () => {
      try {
        setCheckingBreach(true)
        const count = await getPasswordBreachCount(pwd)
        setBreachCount(count)
      } catch (e) {
        setBreachCount(null)
      } finally {
        setCheckingBreach(false)
      }
    }, 600)
    return () => clearTimeout(handle)
  }, [formData.password])

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleGeneratePassword = async () => {
    setIsGeneratingPassword(true);
    try {
      const password = await generateSecurePassword(16);
      setFormData(prev => ({ ...prev, password }));
    } catch (error) {
      console.error('Failed to generate password:', error);
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate ID for new entries
    const entryData = {
      ...formData,
      id: formData.id || `entry_${Date.now()}`
    };
    
    onSave(entryData);
    onClose();
  };

  const isFormValid = formData.name.trim() && formData.username.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {entry ? 'Edit Entry' : 'Add New Entry'}
            </h2>
            <motion.button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              whileTap={{ scale: 0.96 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="e.g., Gmail, Bank Account"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              placeholder="https://example.com"
            />
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Username/Email *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="username@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 pr-20 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter password"
                />
                <div className="absolute right-1 top-1 flex space-x-1">
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleGeneratePassword}
                    disabled={isGeneratingPassword}
                    className="p-1.5 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                    whileTap={{ scale: 0.95 }}
                  >
                    {isGeneratingPassword ? (
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-purple-500 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </div>
              {breachCount !== null && breachCount > 0 && (
                <div className="mt-2 p-3 border border-amber-200 bg-amber-50 rounded-md text-sm text-amber-800">
                  This password appears in known breaches {breachCount.toLocaleString()} times. Consider a unique, stronger password.
                </div>
              )}
              {checkingBreach && (
                <div className="mt-2 text-xs text-slate-500">Checking breaches…</div>
              )}
            </div>
          </div>

          {/* 2FA */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              2FA Secret (Base32)
            </label>
            <input
              type="text"
              value={formData.totpSecret}
              onChange={(e) => handleInputChange('totpSecret', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition font-mono text-sm"
              placeholder="JBSWY3DPEHPK3PXP"
            />
            <p className="text-xs text-slate-500 mt-1">
              Enter the base32 secret from your authenticator app
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 border border-purple-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 hover:text-purple-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                placeholder="Add tag..."
              />
              <motion.button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Add
              </motion.button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Additional notes..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 flex justify-end space-x-3">
          <motion.button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            {entry ? 'Update Entry' : 'Create Entry'}
          </motion.button>
        </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EntryForm;
