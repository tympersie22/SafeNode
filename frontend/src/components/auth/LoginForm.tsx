import React, { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import PasswordInput from '../ui/PasswordInput'
import { Link } from 'react-router-dom'
import Logo from '../Logo'
import SocialAuthButtons from './SocialAuthButtons'

interface LoginFormProps {
  onLogin: (email: string, password: string) => void
  onSwitchToSignup: () => void
  isLoading?: boolean
  error?: string
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onLogin, 
  onSwitchToSignup, 
  isLoading = false, 
  error 
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const emailInputRef = useRef<HTMLInputElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Focus email input on mount for accessibility
  useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      onLogin(email, password)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && email && password) {
      handleSubmit(e as any)
    }
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg"
      role="main"
      aria-labelledby="login-heading"
    >
      <div className="text-center mb-8">
        <div 
          className="w-14 h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gray-950/5"
          aria-hidden="true"
        >
          <Logo variant="icon" size="sm" />
        </div>
        <h2 
          id="login-heading"
          className="text-3xl font-bold text-gray-900 mb-2"
        >
          Welcome back
        </h2>
        <p className="text-gray-600">
          Sign in to access your secure vault
        </p>
      </div>

      {error && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-red-700 text-sm font-medium mb-1">{error}</p>
              <p className="text-red-600 text-xs">
                Don't have an account?{' '}
                <button
                  onClick={onSwitchToSignup}
                  className="underline font-semibold hover:text-red-800"
                >
                  Create one here
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <form 
        onSubmit={handleSubmit} 
        className="space-y-6"
        aria-label="Login form"
        noValidate
      >
        <Input
          id="login-email"
          ref={emailInputRef}
          type="email"
          label="Email Address"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          error={error ? undefined : undefined}
          aria-describedby={error ? "login-error" : undefined}
        />

        <div>
          <PasswordInput
            id="login-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your password"
            required
            hint="After login, you can enable Touch ID, Face ID, or PIN for faster access"
          />
          <div className="mt-1 text-right">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={isLoading}
          disabled={!email || !password || isLoading}
          aria-label={isLoading ? "Signing in, please wait" : "Sign in to your account"}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      <SocialAuthButtons mode="login" disabled={isLoading} />

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Don&apos;t have an account?{' '}
            <button
              onClick={onSwitchToSignup}
              className="text-gray-900 hover:text-gray-700 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 rounded px-1 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900"
              aria-label="Switch to sign up form"
              data-testid="switch-to-signup"
            >
              Create Account
            </button>
          </p>
          
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Your data is encrypted with AES-256-GCM</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default LoginForm
