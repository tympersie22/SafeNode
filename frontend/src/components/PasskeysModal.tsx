import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { listPasskeys, registerPasskey, deletePasskey, authenticateWithPasskey } from '../api/passkeys';
import type { PasskeyRecord } from '../types/passkeys';

interface PasskeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatRelative = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const PasskeysModal: React.FC<PasskeysModalProps> = ({ isOpen, onClose }) => {
  const [passkeys, setPasskeys] = React.useState<PasskeyRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadPasskeys = React.useCallback(async () => {
    try {
      setLoading(true);
      const list = await listPasskeys();
      setPasskeys(list);
    } catch (err) {
      console.error(err);
      setError('Failed to load passkeys.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadPasskeys();
    } else {
      setError(null);
    }
  }, [isOpen, loadPasskeys]);

  const handleRegister = async () => {
    try {
      setLoading(true);
      const friendlyName = window.prompt('Give this passkey a friendly name (optional):', 'My Device') || undefined;
      const record = await registerPasskey(friendlyName);
      setPasskeys(prev => [...prev, record]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to register passkey.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this passkey? This cannot be undone.')) return;
    try {
      setLoading(true);
      await deletePasskey(id);
      setPasskeys(prev => prev.filter(pk => pk.id !== id));
    } catch (err) {
      console.error(err);
      setError('Failed to delete passkey.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAuth = async () => {
    try {
      setLoading(true);
      await authenticateWithPasskey();
      alert('Passkey authentication succeeded.');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="passkeys-title"
          >
            <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Back" title="Back">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <h3 id="passkeys-title" className="text-lg font-semibold text-slate-900">Passkeys</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Close dialog">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-slate-600">
                  Register passkeys to unlock your SafeNode vault with Face ID, Touch ID, or Windows Hello.
                  Passkeys are synced securely with your vault.
                </p>

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">{error}</div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button onClick={handleRegister} className="btn btn-sm btn-primary" disabled={loading}>
                    {loading ? 'Working…' : 'Register new passkey'}
                  </button>
                  <button onClick={handleTestAuth} className="btn btn-sm btn-outline" disabled={loading || passkeys.length === 0}>
                    Test authentication
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {loading && passkeys.length === 0 && (
                    <div className="p-4 text-sm text-slate-500">Loading passkeys…</div>
                  )}
                  {!loading && passkeys.length === 0 && (
                    <div className="p-4 text-sm text-slate-500">No passkeys registered yet.</div>
                  )}
                  {passkeys.map(pk => (
                    <div key={pk.id} className="p-4 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{pk.friendlyName || pk.id}</p>
                        <p className="text-slate-500 text-xs">
                          Registered {formatRelative(pk.createdAt)} • ID: {pk.id}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(pk.id)}
                        className="btn btn-sm btn-outline"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PasskeysModal;

