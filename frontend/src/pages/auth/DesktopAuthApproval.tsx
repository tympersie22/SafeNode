import { useState } from 'react'
import { CheckCircle2, Laptop, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import Auth from '../Auth'
import { API_BASE } from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { getCurrentDeviceId } from '../../services/deviceService'
import { getToken } from '../../services/authService'
import { Spinner } from '../../components/ui/Spinner'

const VALUE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/

export default function DesktopAuthApproval() {
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated, isAuthInitialized } = useAuth()
  const [status, setStatus] = useState<'idle' | 'approving' | 'complete'>('idle')
  const [error, setError] = useState<string | null>(null)
  const flowId = searchParams.get('flow') || ''
  const state = searchParams.get('state') || ''
  const validRequest = VALUE_PATTERN.test(flowId) && VALUE_PATTERN.test(state)

  if (!validRequest) {
    return (
      <main className="sn-page flex min-h-screen items-center justify-center px-6">
        <section className="w-full max-w-xl border border-red-300 bg-red-50 p-8 text-red-800">
          <h1 className="sn-display">Invalid desktop request.</h1>
          <p className="mt-4 text-sm leading-6">Return to the Safenode desktop app and begin again.</p>
        </section>
      </main>
    )
  }

  if (!isAuthInitialized) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>
  }

  if (!isAuthenticated || !user) {
    return <Auth initialMode="login" onAuthenticated={() => undefined} />
  }

  const approve = async () => {
    setStatus('approving')
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/api/desktop-auth/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken() || ''}`,
          'X-Device-ID': getCurrentDeviceId(),
        },
        credentials: 'include',
        body: JSON.stringify({ flowId, state }),
      })
      const data = await response.json().catch(() => ({ message: 'Desktop approval failed.' }))
      if (!response.ok) throw new Error(data.message || 'Desktop approval failed.')

      setStatus('complete')
      window.location.assign(data.redirectUrl)
    } catch (approvalError) {
      setStatus('idle')
      setError(approvalError instanceof Error ? approvalError.message : 'Desktop approval failed.')
    }
  }

  return (
    <main className="sn-page relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="sn-hero-grid" aria-hidden="true" />
      <section className="relative w-full max-w-2xl border border-[var(--sn-line)] bg-[var(--sn-surface)] p-8 sm:p-12">
        <div className="flex h-12 w-12 items-center justify-center border border-[var(--sn-line)] text-[var(--sn-accent)]">
          {status === 'complete' ? <CheckCircle2 className="h-6 w-6" /> : <Laptop className="h-6 w-6" />}
        </div>
        <p className="sn-eyebrow mt-8">Desktop authorization</p>
        <h1 className="sn-display mt-5">Approve this Safenode desktop session.</h1>
        <p className="mt-6 text-lg leading-8 text-[var(--sn-muted)]">
          Signed in as <strong className="text-[var(--sn-ink)]">{user.email}</strong>. Only continue if you started this request from your installed Safenode app.
        </p>

        <div className="mt-8 grid gap-3 border-y border-[var(--sn-line)] py-6 text-sm text-[var(--sn-muted)] sm:grid-cols-2">
          <span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[var(--sn-accent)]" /> One-time code</span>
          <span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[var(--sn-accent)]" /> Expires in five minutes</span>
          <span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[var(--sn-accent)]" /> Bound to the requesting app</span>
          <span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[var(--sn-accent)]" /> No vault key transferred</span>
        </div>

        {error && <p className="mt-6 border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {status === 'complete' ? (
          <p className="mt-8 border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">Approved. You can return to the Safenode desktop app.</p>
        ) : (
          <button type="button" onClick={approve} disabled={status === 'approving'} className="sn-solid-button mt-8 w-full sm:w-auto">
            {status === 'approving' ? 'Approving secure session…' : 'Approve desktop app'}
          </button>
        )}
      </section>
    </main>
  )
}
