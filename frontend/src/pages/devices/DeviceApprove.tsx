import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import Logo from '../../components/Logo'
import { confirmDeviceReapproval } from '../../services/deviceService'

const DeviceApprovePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>(token ? 'idle' : 'error')
  const [message, setMessage] = useState(
    token
      ? 'Approve this device to restore its access to your Safenode vault. This only re-approves the device — it does not sign anyone in or unlock your vault.'
      : 'Missing approval token. Request a new re-approval link from the device.',
  )

  const approve = async () => {
    if (!token) {
      setState('error')
      setMessage('Missing approval token. Request a new re-approval link from the device.')
      return
    }
    try {
      setState('loading')
      setMessage('Approving device…')
      const result = await confirmDeviceReapproval(token)
      setState('success')
      setMessage(
        result.deviceName
          ? `"${result.deviceName}" approved. Return to Safenode on that device and unlock your vault.`
          : 'Device approved. Return to Safenode on that device and unlock your vault.',
      )
    } catch (error: any) {
      setState('error')
      setMessage(error?.message || 'This approval link is invalid or has expired. Request a new one from the device.')
    }
  }

  return (
    <div className="sn-page min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
      >
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-5">
            <Logo variant="nav" />
            <span className="text-xl font-bold text-gray-900">Safenode</span>
          </Link>

          {state === 'loading' && <Loader2 className="w-10 h-10 animate-spin mx-auto text-gray-600" />}
          {state === 'success' && <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />}
          {state === 'error' && <AlertCircle className="w-10 h-10 mx-auto text-red-600" />}
          {state === 'idle' && <ShieldCheck className="w-10 h-10 mx-auto text-gray-600" />}

          <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Approve device</h1>
          <p className="text-gray-600">{message}</p>
        </div>

        <div className="flex flex-col gap-3">
          {state === 'idle' && (
            <button
              type="button"
              onClick={approve}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-950 hover:bg-gray-800 text-white font-semibold rounded-xl"
            >
              Approve this device
            </button>
          )}
          {state === 'error' && !token && (
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-950 hover:bg-gray-800 text-white font-semibold rounded-xl"
            >
              Back to Safenode
            </Link>
          )}
          <Link
            to="/settings/devices"
            className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-900 font-semibold rounded-xl"
          >
            Manage devices
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default DeviceApprovePage
