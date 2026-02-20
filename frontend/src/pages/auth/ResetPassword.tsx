/**
 * Reset Password Page
 * Allows users to set a new password using a reset token
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, ArrowLeft, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react'
import Logo from '../../components/Logo'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordsMatch = password === confirmPassword
  const passwordValid = password.length >= 8

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch || !passwordValid || !token) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="w-9 h-9 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            to="/auth/forgot-password"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-950 hover:bg-gray-800 text-white font-semibold rounded-xl transition min-h-[44px]"
          >
            Request New Link
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Logo variant="nav" />
            <span className="text-xl font-bold text-gray-900">SafeNode</span>
          </Link>

          {success ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4"
              >
                <CheckCircle className="w-9 h-9 text-green-600" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h1>
              <p className="text-gray-600">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Lock className="w-9 h-9 text-gray-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Set New Password</h1>
              <p className="text-gray-600">
                Enter your new password below.
              </p>
            </>
          )}
        </div>

        {/* Form */}
        {!success && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoFocus
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-950 focus:border-transparent outline-none transition text-base min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 touch-manipulation"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && !passwordValid && (
                <p className="text-sm text-red-500 mt-1">Password must be at least 8 characters</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-950 focus:border-transparent outline-none transition text-base min-h-[44px]"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordValid || !passwordsMatch}
              className="w-full py-3 bg-gray-950 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold rounded-xl transition min-h-[44px] flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Reset Password'
              )}
            </button>
          </motion.form>
        )}

        {/* Footer Links */}
        <div className="mt-6 text-center">
          {success ? (
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-950 hover:bg-gray-800 text-white font-semibold rounded-xl transition min-h-[44px] w-full"
            >
              Sign In
            </button>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-medium min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ResetPasswordPage
