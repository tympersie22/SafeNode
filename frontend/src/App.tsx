import React, { useState } from 'react';
import UnlockVault from './components/UnlockVault';
import EntryForm from './components/EntryForm';
import { generateTotpCode, encrypt, arrayBufferToBase64, base64ToArrayBuffer } from './crypto/crypto';
import { vaultStorage } from './storage/vaultStorage';
import { vaultSync } from './sync/vaultSync';
import { enhancedCopyToClipboard, isTauri, DesktopVault } from './desktop/integration';
import KeyRotation from './components/KeyRotation';
import SecurityAdvisor from './components/SecurityAdvisor';
import SharingKeys from './components/SharingKeys';
import ShareEntryModal from './components/ShareEntryModal';
import ImportSharedModal from './components/ImportSharedModal';

interface VaultEntry {
  id: string;
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  tags?: string[];
  category?: string;
  totpSecret?: string; // base32
}

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

  const handleVaultUnlocked = (unlockedVault: VaultData) => {
    setVault(unlockedVault);
    setIsUnlocked(true);
  };

  const handleLock = () => {
    setVault(null);
    setIsUnlocked(false);
  };

  const handleKeyRotationSuccess = () => {
    // After successful key rotation, lock the vault
    // User will need to log in with new password
    handleLock();
    alert('Master key rotated successfully! Please log in with your new password.');
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

  if (!isUnlocked) {
    return <UnlockVault onVaultUnlocked={handleVaultUnlocked} />;
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900">SafeNode</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                {vault?.entries.length || 0} entries
              </span>
              <button
                onClick={() => setIsSharingKeysOpen(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                title="Manage sharing keys"
              >
                Keys
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                title="Import shared entry"
              >
                Import
              </button>
              <button
                onClick={() => setIsKeyRotationOpen(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                title="Change master password"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Change Password
              </button>
              <button
                onClick={handleLock}
                className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Lock
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {vault && vault.entries.length > 0 ? (
          <div className="space-y-6">
            {/* Security Advisor */}
            <SecurityAdvisor entries={(vault?.entries || []).map(e => ({
              id: e.id,
              name: e.name,
              username: e.username,
              password: e.password,
              url: e.url
            }))} />
            {/* Search + Tags + Add Button */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <input
                  className="w-full md:w-80 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Search vault..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <div className="flex items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveTag(null)}
                      className={`px-3 py-1.5 rounded-full border ${activeTag === null ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                    >All</button>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={`px-3 py-1.5 rounded-full border ${activeTag === tag ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                      >{tag}</button>
                    ))}
                  </div>
                  <button
                    onClick={handleAddEntry}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Entry
                  </button>
                </div>
              </div>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Total Entries</p>
                    <p className="text-2xl font-bold text-slate-900">{vault.entries.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Secure</p>
                    <p className="text-2xl font-bold text-slate-900">100%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Encrypted</p>
                    <p className="text-2xl font-bold text-slate-900">AES-256</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Entries List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Password Entries</h2>
                <p className="text-sm text-slate-500">Your encrypted password vault</p>
              </div>
              
              <div className="divide-y divide-slate-200">
                {filteredEntries.map((entry, index) => (
                  <div key={entry.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {entry.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-slate-900">{entry.name}</h3>
                          <p className="text-sm text-slate-600">
                            {entry.username} {entry.url && `• ${entry.url}`}
                          </p>
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entry.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{tag}</span>
                              ))}
                            </div>
                          )}
                          {entry.notes && (
                            <p className="text-sm text-slate-500 mt-1">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => enhancedCopyToClipboard(entry.password)}
                          className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Copy password"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                        <button
                          onClick={() => setShareEntry(entry)}
                          className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Share entry"
                        >
                          Share
                        </button>
                        <button
                          onClick={() => handleEditEntry(entry)}
                          disabled={isSaving}
                          className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
                          title="Edit entry"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={isSaving}
                          className="inline-flex items-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:text-red-900 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete entry"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                        {entry.totpSecret && (
                          <TotpBadge secret={entry.totpSecret} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
    </div>
  );
};

export default App;
 
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
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900">
      <span className="font-mono tracking-widest">{code}</span>
      <span className="text-xs text-slate-500">{remaining}s</span>
    </div>
  )
}