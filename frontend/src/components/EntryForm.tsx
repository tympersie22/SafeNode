import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { generateSecurePassword, getPasswordBreachCount } from '../crypto/crypto';
import type { VaultEntry, VaultAttachment } from '../types/vault';
import PasswordGeneratorModal from './PasswordGeneratorModal';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { organizeEntry } from '../utils/vaultOrganizer';

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
    totpSecret: '',
    attachments: [],
    passwordUpdatedAt: Date.now()
  });
  
  const [tagInput, setTagInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [breachCount, setBreachCount] = useState<number | null>(null);
  const [checkingBreach, setCheckingBreach] = useState(false);
  const [attachments, setAttachments] = useState<VaultAttachment[]>([]);
  const [isNotePreview, setIsNotePreview] = useState(false);
  const [originalPassword, setOriginalPassword] = useState('');
  const [lastBreachCheck, setLastBreachCheck] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

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
          totpSecret: entry.totpSecret || '',
          attachments: entry.attachments || [],
          passwordUpdatedAt: entry.passwordUpdatedAt ?? Date.now()
        });
        setAttachments(entry.attachments || []);
        setOriginalPassword(entry.password || '');
        setBreachCount(entry.breachCount ?? null);
        setLastBreachCheck(entry.lastBreachCheck ?? null);
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
          totpSecret: '',
          attachments: [],
          passwordUpdatedAt: Date.now()
        });
        setAttachments([]);
        setOriginalPassword('');
        setBreachCount(null);
        setLastBreachCheck(null);
      }
      setTagInput('');
      setShowPassword(false);
      setIsNotePreview(false);
    }
  }, [isOpen, entry]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, attachments }));
  }, [attachments]);

  // AI Vault Organizer - Auto-suggest category and tags for new entries
  useEffect(() => {
    if (!isOpen || entry) return; // Only for new entries
    
    const name = formData.name.trim();
    const url = (formData.url || '').trim();
    
    if (name || url) {
      const suggestion = organizeEntry({
        name,
        url,
        username: formData.username,
        category: formData.category
      });
      
      // Auto-apply if confidence is high and category/tags are empty
      if (suggestion.confidence >= 0.7) {
        if (!formData.category || formData.category === 'Login') {
          setFormData(prev => ({
            ...prev,
            category: suggestion.category || prev.category
          }));
        }
        
        // Merge suggested tags
        if (suggestion.tags && suggestion.tags.length > 0) {
          const existingTags = formData.tags || [];
          const newTags = suggestion.tags.filter(tag => !existingTags.includes(tag));
          if (newTags.length > 0) {
            setFormData(prev => ({
              ...prev,
              tags: [...existingTags, ...newTags]
            }));
          }
        }
      }
    }
  }, [formData.name, formData.url, formData.username, isOpen, entry]);

  const fileToBase64 = (file: File): Promise<VaultAttachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (!result) {
          reject(new Error('Failed to read file'));
          return;
        }
        const buffer = result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        resolve({
          id: `${file.name}-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          data: base64,
          createdAt: Date.now()
        });
      };
      reader.onerror = () => reject(reader.error || new Error('File read failed'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;
    try {
      const processed = await Promise.all(files.map(fileToBase64));
      setAttachments(prev => [...prev, ...processed]);
    } catch (error) {
      console.error('Failed to process attachments:', error);
      alert('Failed to add one or more attachments.');
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const downloadAttachment = (attachment: VaultAttachment) => {
    try {
      const binary = window.atob(attachment.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: attachment.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('Failed to download attachment.');
    }
  };

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
        setLastBreachCheck(Date.now())
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
      // Quick generate a strong password
      const quickPassword = await generateSecurePassword(20, {
        length: 20,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: false,
        excludeAmbiguous: false,
        customExclude: '',
        requireEachType: true
      });
      setFormData(prev => ({ ...prev, password: quickPassword }));
      setErrors(prev => ({ ...prev, password: '' }));
    } catch (error) {
      console.error('Failed to generate password:', error);
      // Fallback to modal
      setShowPasswordGenerator(true);
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const handlePasswordGenerated = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    setShowPasswordGenerator(false);
    setErrors(prev => ({ ...prev, password: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username/Email is required';
    }
    
    if (formData.url && formData.url.trim()) {
      // Auto-prepend https:// if no protocol specified
      if (!/^https?:\/\//.test(formData.url)) {
        formData.url = 'https://' + formData.url.trim();
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Generate ID for new entries
    const entryData = {
      ...formData,
      id: formData.id || `entry_${Date.now()}`,
      attachments,
      breachCount,
      lastBreachCheck,
      passwordUpdatedAt: originalPassword && originalPassword === formData.password
        ? formData.passwordUpdatedAt ?? Date.now()
        : Date.now()
    };
    
    onSave(entryData);
    onClose();
  };

  const isFormValid = formData.name.trim() && formData.username.trim() && Object.values(errors).filter(v => v).length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[69]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-form-title"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] shadow-2xl overflow-hidden mx-1 sm:mx-4" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Back" title="Back">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-secondary-500 to-secondary-400 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <h2 id="entry-form-title" className="text-lg font-semibold text-slate-900">
                          {entry ? 'Edit Entry' : 'Add New Entry'}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {entry ? 'Update your password entry' : 'Create a new password entry'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Close dialog">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto max-h-[calc(85vh-180px)]">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        handleInputChange('name', e.target.value);
                        setErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className={`w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 transition ${
                        errors.name 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:ring-secondary-500 focus:border-secondary-500'
                      }`}
                      placeholder="e.g., Gmail, Bank Account"
                      required
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition bg-white"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => {
                      handleInputChange('url', e.target.value);
                      setErrors(prev => ({ ...prev, url: '' }));
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                      errors.url 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-slate-200 focus:ring-secondary-500 focus:border-secondary-500'
                    }`}
                    placeholder="https://example.com"
                  />
                  {errors.url && (
                    <p className="mt-1 text-xs text-red-600">{errors.url}</p>
                  )}
                </div>

                {/* Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Username/Email *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => {
                        handleInputChange('username', e.target.value);
                        setErrors(prev => ({ ...prev, username: '' }));
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
                        errors.username 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:ring-secondary-500 focus:border-secondary-500'
                      }`}
                      placeholder="username@example.com"
                      required
                    />
                    {errors.username && (
                      <p className="mt-1 text-xs text-red-600">{errors.username}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full px-3 py-2 pr-20 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition"
                        placeholder="Enter password"
                      />
                      <div className="absolute right-1 top-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
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
                        </button>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          disabled={isGeneratingPassword}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                          {isGeneratingPassword ? (
                            <div className="w-4 h-4 border-2 border-slate-300 border-t-secondary-500 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <PasswordStrengthMeter password={formData.password} className="mt-2" />
                    {breachCount !== null && breachCount > 0 && (
                      <div className="mt-2 p-3 border border-amber-200 bg-amber-50 rounded-lg text-xs text-amber-800">
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
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    2FA Secret (Base32)
                  </label>
                  <input
                    type="text"
                    value={formData.totpSecret}
                    onChange={(e) => handleInputChange('totpSecret', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition font-mono text-xs"
                    placeholder="JBSWY3DPEHPK3PXP"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the base32 secret from your authenticator app
                  </p>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.tags?.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1.5 hover:text-slate-900"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition"
                      placeholder="Add tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="btn btn-sm btn-outline"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Secure Notes
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setIsNotePreview(false)}
                        className={`px-2 py-1 rounded ${isNotePreview ? 'text-slate-500 hover:text-slate-700' : 'bg-slate-100 text-slate-700'}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNotePreview(true)}
                        className={`px-2 py-1 rounded ${isNotePreview ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                  {isNotePreview ? (
                    <div className="w-full min-h-[120px] px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700 whitespace-pre-wrap">
                      {formData.notes?.trim() ? formData.notes : 'Nothing here yet.'}
                    </div>
                  ) : (
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition"
                      placeholder="Add secure notes, recovery codes, or instructions..."
                    />
                  )}
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Attachments
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-md file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Files are encrypted locally before upload. Keep attachment sizes reasonable for smooth syncing.
                  </p>
                  {attachments.length > 0 && (
                    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-xs bg-white hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-medium text-slate-700">{attachment.name}</p>
                            <p className="text-slate-500">
                              {(attachment.size / 1024).toFixed(1)} KB • {new Date(attachment.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => downloadAttachment(attachment)}
                              className="btn btn-sm btn-outline"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(attachment.id)}
                              className="btn btn-sm btn-outline text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-white dark:bg-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-sm btn-outline w-full sm:w-auto min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="btn btn-sm btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {entry ? 'Update Entry' : 'Create Entry'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
      <PasswordGeneratorModal
        isOpen={showPasswordGenerator}
        onClose={() => setShowPasswordGenerator(false)}
        onGenerate={handlePasswordGenerated}
      />
    </AnimatePresence>
  );
};

export default EntryForm;
