import React, { useState } from 'react'
import { requestDeviceReapprovalEmail } from '../services/deviceService'

interface DeviceReapprovalPanelProps {
  /** Optional message from the server explaining the removed-device state. */
  message?: string | null
}

/**
 * Shown when this device was removed from the account and needs re-approval.
 * Because re-approval normally requires another trusted device, this offers an
 * email-based escape: the owner gets a one-time link to approve this device.
 */
const DeviceReapprovalPanel: React.FC<DeviceReapprovalPanelProps> = ({ message }) => {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setSending(true)
    setError(null)
    try {
      const msg = await requestDeviceReapprovalEmail()
      setSent(msg)
    } catch (e: any) {
      setError(e?.message || 'Could not send the re-approval email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
      role="alert"
      aria-live="polite"
    >
      <p className="text-base font-semibold text-amber-900">This device needs re-approval</p>
      <p className="mt-1 leading-6">
        {message || 'This device was removed from your account. Approve it from another trusted device, or email yourself a one-time approval link to restore access here.'}
      </p>

      {sent ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-800">
          {sent} After approving from the link, return here and unlock again.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="mt-4 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Email me a re-approval link'}
        </button>
      )}

      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </div>
  )
}

export default DeviceReapprovalPanel
