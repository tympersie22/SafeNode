import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { exportPublicKeyJwk, importPublicKeyJwk, importPrivateKeyJwk, encryptForRecipient } from '../crypto/crypto'

interface ShareEntryModalProps {
  isOpen: boolean
  onClose: () => void
  entry: {
    id: string
    name: string
    username: string
    password: string
    url?: string
    notes?: string
    tags?: string[]
    category?: string
    totpSecret?: string
  } | null
}

const LS_PRIV = 'safenode_sharing_priv_jwk'
const LS_PUB = 'safenode_sharing_pub_jwk'

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer (read-only)' },
  { value: 'editor', label: 'Editor (can edit)' }
] as const

type ShareRole = typeof ROLE_OPTIONS[number]['value']

const EXPIRE_OPTIONS = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'never', label: 'No expiry' }
] as const

type ExpireOption = typeof EXPIRE_OPTIONS[number]['value']

const ShareEntryModal: React.FC<ShareEntryModalProps> = ({ isOpen, onClose, entry }) => {
  const [recipientJwkText, setRecipientJwkText] = React.useState('')
  const [envelopeText, setEnvelopeText] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [shareRole, setShareRole] = React.useState<ShareRole>('viewer')
  const [expireOption, setExpireOption] = React.useState<ExpireOption>('7d')

  React.useEffect(() => {
    if (!isOpen) {
      setRecipientJwkText('')
      setEnvelopeText('')
      setError(null)
    }
  }, [isOpen])

  const handleShare = async () => {
    if (!entry) return
    setBusy(true)
    setError(null)
    try {
      // Load our own key pair from localStorage
      const privJwkStr = localStorage.getItem(LS_PRIV)
      const pubJwkStr = localStorage.getItem(LS_PUB)
      if (!privJwkStr || !pubJwkStr) {
        throw new Error('Generate your sharing keys first in "My Sharing Keys"')
      }
      const senderPriv = await importPrivateKeyJwk(JSON.parse(privJwkStr))
      const senderPub = await importPublicKeyJwk(JSON.parse(pubJwkStr))

      // Import recipient public key
      const recipientJwk = JSON.parse(recipientJwkText)
      const recipientPub = await importPublicKeyJwk(recipientJwk)

      // Prepare payload
      const now = Date.now()
      let expiresAt: number | null = null
      switch (expireOption) {
        case '24h':
          expiresAt = now + 24 * 60 * 60 * 1000
          break
        case '7d':
          expiresAt = now + 7 * 24 * 60 * 60 * 1000
          break
        case '30d':
          expiresAt = now + 30 * 24 * 60 * 60 * 1000
          break
        case 'never':
        default:
          expiresAt = null
      }

      const payload = JSON.stringify({
        type: 'safenode-entry-share',
        version: 1,
        issuedAt: now,
        expiresAt,
        role: shareRole,
        entry
      })
      const envelope = await encryptForRecipient(payload, senderPriv, senderPub, recipientPub)
      setEnvelopeText(JSON.stringify(envelope))
    } catch (e: any) {
      setError(e?.message || 'Failed to create share envelope')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && entry && (
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
            aria-labelledby="share-entry-title"
          >
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 max-w-2xl w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" whileTap={{ scale: 0.96 }} aria-label="Back" title="Back">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </motion.button>
            <h3 id="share-entry-title" className="text-lg font-semibold text-slate-900">Share Entry</h3>
          </div>
          <motion.button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" whileTap={{ scale: 0.96 }} aria-label="Close dialog">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </motion.button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Recipient Public Key (JWK JSON)</div>
            <textarea
              value={recipientJwkText}
              onChange={(e) => setRecipientJwkText(e.target.value)}
              className="w-full min-h-[120px] px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
              placeholder="Paste recipient's public key JWK here"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as ShareRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              >
                {ROLE_OPTIONS.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Viewers can read only. Editors can import and modify.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Link expiry</label>
              <select
                value={expireOption}
                onChange={(e) => setExpireOption(e.target.value as ExpireOption)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              >
                {EXPIRE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                After expiry, the recipient will be blocked from importing this envelope.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end">
            <motion.button
              onClick={handleShare}
              disabled={busy || !recipientJwkText.trim()}
              className="btn btn-md btn-primary disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {busy ? 'Encrypting…' : 'Create Share Envelope'}
            </motion.button>
          </div>

          {envelopeText && (
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2">Encrypted Envelope</div>
              <textarea
                value={envelopeText}
                readOnly
                className="w-full min-h-[200px] px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
              />
              <div className="mt-2 flex justify-end">
                <motion.button
                  onClick={() => navigator.clipboard.writeText(envelopeText)}
                  className="btn btn-sm btn-outline"
                  whileTap={{ scale: 0.98 }}
                >Copy</motion.button>
              </div>
            </div>
          )}
        </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ShareEntryModal


