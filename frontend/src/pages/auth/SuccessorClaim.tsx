import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, TimerReset, UserRoundPlus } from 'lucide-react'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import {
  completeAccountSuccessorClaim,
  getAccountSuccessorClaimStatus,
  requestAccountSuccessorClaim
} from '../../services/accountSuccessorService'
import { useAuth } from '../../contexts/AuthContext'

const SuccessorClaimPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const token = searchParams.get('token') || ''

  const [ownerEmail, setOwnerEmail] = useState('')
  const [successorEmail, setSuccessorEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<any>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return

    setLoading(true)
    setError(null)
    getAccountSuccessorClaimStatus(token)
      .then(setStatus)
      .catch((err: any) => setError(err.message || 'Failed to load succession claim'))
      .finally(() => setLoading(false))
  }, [token])

  const countdownText = useMemo(() => {
    if (!status?.claimAvailableAt) return null
    return new Date(status.claimAvailableAt).toLocaleString()
  }, [status])

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const result = await requestAccountSuccessorClaim({ ownerEmail, successorEmail })
      setMessage(`${result.message} Claim becomes available on ${new Date(result.claimAvailableAt).toLocaleString()}.`)
    } catch (err: any) {
      setError(err.message || 'Failed to start succession claim')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await completeAccountSuccessorClaim({ token, password, displayName })
      login(result.user, result.token)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Failed to complete succession claim')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--sn-ink-fixed,#14201b)] px-4 py-10 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Account Successor</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Safenode uses a delayed-transfer model. The owner can designate a successor, a claim starts a waiting period, and the owner can cancel it before any account transfer is allowed.
          </p>
        </div>

        <SaasCard className="bg-slate-900/80 text-slate-100 border-slate-800" padding="lg">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
            <div className="space-y-2 text-sm text-slate-300">
              <p className="font-medium text-white">Security boundary</p>
              <p>
                Successor transfer changes account control. Existing vault contents remain encrypted and still depend on recovery materials previously arranged by the owner.
              </p>
            </div>
          </div>
        </SaasCard>

        {!token ? (
          <SaasCard className="bg-slate-900/80 text-slate-100 border-slate-800" padding="lg">
            <div className="mb-6 flex items-center gap-3">
              <UserRoundPlus className="h-5 w-5 text-cyan-400" />
              <div>
                <h2 className="text-xl font-semibold">Start a succession claim</h2>
                <p className="text-sm text-slate-400">Use the owner email and the successor email that was registered in Safenode.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleRequest}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Owner email</span>
                  <input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Successor email</span>
                  <input value={successorEmail} onChange={(e) => setSuccessorEmail(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400" />
                </label>
              </div>
              {message && <p className="text-sm text-emerald-400">{message}</p>}
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <SaasButton type="submit" variant="primary" isLoading={loading}>Start claim</SaasButton>
            </form>
          </SaasCard>
        ) : (
          <SaasCard className="bg-slate-900/80 text-slate-100 border-slate-800" padding="lg">
            <div className="mb-6 flex items-center gap-3">
              <TimerReset className="h-5 w-5 text-amber-400" />
              <div>
                <h2 className="text-xl font-semibold">Succession claim status</h2>
                <p className="text-sm text-slate-400">This page stays valid until the claim expires or the owner cancels it.</p>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading claim details…</p>
            ) : error ? (
              <p className="text-sm text-rose-400">{error}</p>
            ) : status ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Owner</p>
                    <p className="mt-2 text-sm text-slate-200">{status.ownerEmail}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Successor</p>
                    <p className="mt-2 text-sm text-slate-200">{status.successorEmail}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-sm text-slate-300">{status.message}</p>
                  {countdownText && (
                    <p className="mt-2 text-sm text-cyan-300">Available after: {countdownText}</p>
                  )}
                </div>

                {status.status === 'ready' ? (
                  <form className="space-y-4" onSubmit={handleComplete}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span className="text-slate-300">Display name</span>
                        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400" />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="text-slate-300">New account password</span>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400" />
                      </label>
                    </div>
                    {error && <p className="text-sm text-rose-400">{error}</p>}
                    <SaasButton type="submit" variant="primary" isLoading={loading}>Take over account</SaasButton>
                  </form>
                ) : null}
              </div>
            ) : null}
          </SaasCard>
        )}
      </div>
    </div>
  )
}

export default SuccessorClaimPage
