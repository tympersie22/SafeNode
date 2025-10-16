import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { importPrivateKeyJwk, decryptFromSender } from '../crypto/crypto'

interface ImportSharedModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (entry: any) => void
}

const LS_PRIV = 'safenode_sharing_priv_jwk'

const ImportSharedModal: React.FC<ImportSharedModalProps> = ({ isOpen, onClose, onImport }) => {
  const [envelopeText, setEnvelopeText] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [shareMeta, setShareMeta] = React.useState<{ role?: string; expiresAt?: number | null } | null>(null)

  React.useEffect(() => {
    if (!isOpen) {
      setEnvelopeText('')
      setError(null)
      setShareMeta(null)
    }
  }, [isOpen])

  // Close on ESC
  React.useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const handleImport = async () => {
    setBusy(true)
    setError(null)
    try {
      const privJwkStr = localStorage.getItem(LS_PRIV)
      if (!privJwkStr) throw new Error('Import your private key in "My Sharing Keys" first')
      const recipientPriv = await importPrivateKeyJwk(JSON.parse(privJwkStr))
      const envelope = JSON.parse(envelopeText)
      const plaintext = await decryptFromSender(envelope, recipientPriv)
      const parsed = JSON.parse(plaintext)
      if (parsed?.type === 'safenode-entry-share') {
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          throw new Error('This share link has expired')
        }
        if (!parsed.entry) throw new Error('Invalid share payload')
        setShareMeta({ role: parsed.role, expiresAt: parsed.expiresAt })
        onImport(parsed.entry)
      } else if (parsed?.type === 'safenode-entry') {
        onImport(parsed.entry)
      } else {
        throw new Error('Invalid envelope payload')
      }
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to import shared entry')
    } finally {
      setBusy(false)
    }
  }

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
            aria-labelledby="import-shared-title"
          >
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 max-w-2xl w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" whileTap={{ scale: 0.96 }} aria-label="Back" title="Back">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </motion.button>
            <h3 id="import-shared-title" className="text-lg font-semibold text-slate-900">Import Shared Entry</h3>
          </div>
          <motion.button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" whileTap={{ scale: 0.96 }} aria-label="Close dialog">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </motion.button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Encrypted Envelope (JSON)</div>
            <textarea
              value={envelopeText}
              onChange={(e) => setEnvelopeText(e.target.value)}
              className="w-full min-h-[200px] px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
              placeholder='Paste envelope JSON'
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
          )}

          {shareMeta && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              Role granted: <strong>{shareMeta.role || 'viewer'}</strong>
              {shareMeta.expiresAt && (
                <> • Expires {new Date(shareMeta.expiresAt).toLocaleString()}</>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <motion.button
              onClick={handleImport}
              disabled={busy || !envelopeText.trim()}
              className="btn btn-md btn-primary disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {busy ? 'Decrypting…' : 'Import Entry'}
            </motion.button>
          </div>
        </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ImportSharedModal


