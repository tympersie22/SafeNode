import React, { useEffect, useState } from 'react'
import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { initializePaddleCheckout } from '../../services/paddleClient'

export const PaddleCheckoutPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const transactionId = searchParams.get('_ptxn')

  useEffect(() => {
    if (!transactionId) {
      setError('This payment link is incomplete. Start checkout again from the pricing page.')
      return
    }

    initializePaddleCheckout(`${window.location.origin}/billing/success`).catch((checkoutError) => {
      console.error('Failed to initialize Paddle checkout:', checkoutError)
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Unable to initialize secure checkout.'
      )
    })
  }, [transactionId])

  return (
    <main className="sn-page flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg border border-[var(--sn-line)] bg-[var(--sn-surface)] p-8 shadow-2xl shadow-black/5">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center bg-[var(--sn-ink)] text-[var(--sn-canvas)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="sn-eyebrow">Secure payment</p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--sn-ink)]">Paddle checkout</h1>
          </div>
        </div>

        {error ? (
          <>
            <p className="border-l-2 border-red-500 bg-red-500/5 px-4 py-3 text-sm leading-6 text-[var(--sn-ink)]">
              {error}
            </p>
            <button
              type="button"
              onClick={() => navigate('/billing')}
              className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--sn-line)] px-4 text-sm font-semibold text-[var(--sn-ink)] transition hover:bg-[var(--sn-canvas)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to plans
            </button>
          </>
        ) : (
          <div className="flex items-center gap-4 border border-[var(--sn-line)] p-5">
            <CreditCard className="h-6 w-6 text-[var(--sn-accent)]" />
            <div>
              <p className="font-semibold text-[var(--sn-ink)]">Opening encrypted checkout</p>
              <p className="mt-1 text-sm text-[var(--sn-muted)]">
                Paddle will open the payment window automatically.
              </p>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs leading-5 text-[var(--sn-muted)]">
          Payment details are handled by Paddle, SafeNode&apos;s merchant-of-record provider.
        </p>
      </section>
    </main>
  )
}

