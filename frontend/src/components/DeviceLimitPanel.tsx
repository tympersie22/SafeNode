import React, { useState } from 'react'
import { reclaimDeviceSlot } from '../services/deviceService'

export interface DeviceLimitDevice {
  id: string
  deviceId: string
  name: string
  platform: string
  lastSeen: number
  isCurrent?: boolean
}

interface DeviceLimitPanelProps {
  devices: DeviceLimitDevice[]
  current: number
  limit: number
  planName?: string
  recommendedPlanName?: string
  /** Called after a device is removed so the parent can retry vault access. */
  onResolved: () => void
}

/**
 * Shown when a user is blocked by the device limit. Lets them remove one of
 * their existing devices (using only their authenticated session) to free a
 * slot for this device — a self-service escape from the device-limit lockout.
 */
const DeviceLimitPanel: React.FC<DeviceLimitPanelProps> = ({
  devices,
  current,
  limit,
  planName,
  recommendedPlanName,
  onResolved
}) => {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    setError(null)
    try {
      await reclaimDeviceSlot(id)
      onResolved()
    } catch (e: any) {
      setError(e?.message || 'Failed to remove device. Please try again.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
      role="alert"
      aria-live="polite"
    >
      <p className="text-base font-semibold text-amber-900">Device limit reached</p>
      <p className="mt-1 leading-6">
        Your {planName || 'current'} plan allows {limit} device{limit === 1 ? '' : 's'} and you&apos;re at{' '}
        {current}/{limit}. This device isn&apos;t registered yet — remove a device below to use Safenode here
        {recommendedPlanName ? `, or upgrade to ${recommendedPlanName} for more devices.` : '.'}
      </p>

      <ul className="mt-4 space-y-2">
        {devices.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">{d.name || 'Device'}</p>
              <p className="text-xs text-gray-500">
                {d.platform}
                {d.lastSeen ? ` · last used ${new Date(d.lastSeen).toLocaleString()}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(d.id)}
              disabled={removingId !== null}
              className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removingId === d.id ? 'Removing…' : 'Remove'}
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </div>
  )
}

export default DeviceLimitPanel
