import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Logo from '../../components/Logo'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setState('error')
        setMessage('Missing verification token. Please request a new verification email.')
        return
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/verify/${encodeURIComponent(token)}`)
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data?.message || 'Verification failed')
        }

        setState('success')
        setMessage('Email verified successfully. You can now continue using SafeNode.')
      } catch (error: any) {
        setState('error')
        setMessage(error?.message || 'Verification failed. Please request a new verification email.')
      }
    }

    verify()
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
      >
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-5">
            <Logo variant="nav" />
            <span className="text-xl font-bold text-gray-900">SafeNode</span>
          </Link>

          {state === 'loading' && <Loader2 className="w-10 h-10 animate-spin mx-auto text-gray-600" />}
          {state === 'success' && <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />}
          {state === 'error' && <AlertCircle className="w-10 h-10 mx-auto text-red-600" />}

          <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Email Verification</h1>
          <p className="text-gray-600">{message}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/auth"
            className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-950 hover:bg-gray-800 text-white font-semibold rounded-xl"
          >
            Go to Sign In
          </Link>
          <Link
            to="/settings/security"
            className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-900 font-semibold rounded-xl"
          >
            Security Settings
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default VerifyEmailPage
