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

const ShareEntryModal: React.FC<ShareEntryModalProps> = ({ isOpen, onClose, entry }) => {
  const [recipientJwkText, setRecipientJwkText] = React.useState('')
  const [envelopeText, setEnvelopeText] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
      const payload = JSON.stringify({
        type: 'safenode-entry',
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
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 max-w-2xl w-full shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Share Entry</h3>
          <motion.button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" whileTap={{ scale: 0.96 }}>
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

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end">
            <motion.button
              onClick={handleShare}
              disabled={busy || !recipientJwkText.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
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
                  className="px-3 py-2 border rounded-lg"
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


