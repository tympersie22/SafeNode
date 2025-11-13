import React from 'react'
import { generateEcdhKeyPair, exportPublicKeyJwk, exportPrivateKeyJwk, importPrivateKeyJwk, importPublicKeyJwk } from '../crypto/crypto'

interface SharingKeysProps {
  isOpen: boolean
  onClose: () => void
}

const LS_PRIV = 'safenode_sharing_priv_jwk'
const LS_PUB = 'safenode_sharing_pub_jwk'

const SharingKeys: React.FC<SharingKeysProps> = ({ isOpen, onClose }) => {
  const [pubJwk, setPubJwk] = React.useState<JsonWebKey | null>(null)
  const [privJwk, setPrivJwk] = React.useState<JsonWebKey | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) return
    try {
      const pj = localStorage.getItem(LS_PUB)
      const rj = localStorage.getItem(LS_PRIV)
      setPubJwk(pj ? JSON.parse(pj) : null)
      setPrivJwk(rj ? JSON.parse(rj) : null)
    } catch {}
  }, [isOpen])

  const handleGenerate = async () => {
    setBusy(true)
    try {
      const kp = await generateEcdhKeyPair()
      const pub = await exportPublicKeyJwk(kp.publicKey)
      const priv = await exportPrivateKeyJwk(kp.privateKey)
      localStorage.setItem(LS_PUB, JSON.stringify(pub))
      localStorage.setItem(LS_PRIV, JSON.stringify(priv))
      setPubJwk(pub)
      setPrivJwk(priv)
    } finally {
      setBusy(false)
    }
  }

  const handleExport = async () => {
    if (!pubJwk) return
    const blob = new Blob([JSON.stringify(pubJwk, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'safenode-public-key.jwk'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportPriv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const jwk = JSON.parse(text)
    await importPrivateKeyJwk(jwk) // validate
    localStorage.setItem(LS_PRIV, JSON.stringify(jwk))
    setPrivJwk(jwk)
    e.target.value = ''
  }

  const handleImportPub = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const jwk = JSON.parse(text)
    await importPublicKeyJwk(jwk) // validate
    localStorage.setItem(LS_PUB, JSON.stringify(jwk))
    setPubJwk(jwk)
    e.target.value = ''
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Sharing Keys</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">Generate and manage your personal sharing key pair. Share your public key with others so they can send you encrypted entries. Keep your private key secret.</p>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">Public Key</div>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-2 overflow-auto max-h-40">{pubJwk ? JSON.stringify(pubJwk, null, 2) : '— not set —'}</pre>
            <div className="flex gap-2">
              <button onClick={handleGenerate} disabled={busy} className="px-3 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50">{busy ? 'Generating…' : 'Generate New'}</button>
              <button onClick={handleExport} disabled={!pubJwk} className="px-3 py-2 border rounded-lg">Export Public</button>
              <label className="px-3 py-2 border rounded-lg cursor-pointer">
                Import Public
                <input type="file" accept="application/json" className="hidden" onChange={handleImportPub} />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">Private Key</div>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-2 overflow-auto max-h-40">{privJwk ? JSON.stringify(privJwk, null, 2) : '— not set —'}</pre>
            <label className="px-3 py-2 border rounded-lg inline-block cursor-pointer">
              Import Private
              <input type="file" accept="application/json" className="hidden" onChange={handleImportPriv} />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SharingKeys


