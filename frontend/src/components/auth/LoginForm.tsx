import React, { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import { initiateSSOLogin, getSSOProviders } from '../../services/ssoService'
import type { SSOProvider } from '../../services/ssoService'

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
  const [showPassword, setShowPassword] = useState(false)
  const [ssoProviders, setSsoProviders] = useState<SSOProvider[]>([])
  const [isLoadingSSO, setIsLoadingSSO] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Load SSO providers on mount
  useEffect(() => {
    getSSOProviders().then(setSsoProviders)
  }, [])

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
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-lg"
      role="main"
      aria-labelledby="login-heading"
    >
      <div className="text-center mb-8">
        <div 
          className="w-14 h-14 bg-gradient-to-br from-secondary-500 to-secondary-400 dark:from-secondary-600 dark:to-secondary-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-safenode-secondary"
          aria-hidden="true"
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 
          id="login-heading"
          className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2"
        >
          Welcome back
        </h2>
        <p className="text-slate-600">
          Sign in to access your secure vault
        </p>
      </div>

      {error && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-1">{error}</p>
              <p className="text-red-600 dark:text-red-400 text-xs">
                Don't have an account?{' '}
                <button
                  onClick={onSwitchToSignup}
                  className="underline font-semibold hover:text-red-800 dark:hover:text-red-200"
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
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            error={error ? undefined : undefined}
            helperText="After login, you can enable Touch ID, Face ID, or PIN for faster access"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            }
          />
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

      {/* SSO Login Options */}
      {ssoProviders.length > 0 && (
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {ssoProviders.map((provider) => (
              <motion.button
                key={provider.id}
                type="button"
                onClick={() => {
                  setIsLoadingSSO(true)
                  try {
                    initiateSSOLogin(provider.id as 'google' | 'microsoft' | 'github')
                  } catch (err) {
                    setIsLoadingSSO(false)
                  }
                }}
                disabled={isLoading || isLoadingSSO}
                className="flex items-center justify-center px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                aria-label={`Sign in with ${provider.name}`}
              >
                {provider.id === 'google' && (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {provider.id === 'microsoft' && (
                  <svg className="w-5 h-5" viewBox="0 0 23 23" aria-hidden="true">
                    <path fill="#f25022" d="M0 0h11v11H0z"/>
                    <path fill="#00a4ef" d="M12 0h11v11H12z"/>
                    <path fill="#7fba00" d="M0 12h11v11H0z"/>
                    <path fill="#ffb900" d="M12 12h11v11H12z"/>
                  </svg>
                )}
                {provider.id === 'github' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.425 22 12.017 22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                  </svg>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <button
              onClick={onSwitchToSignup}
              className="text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-secondary-500 rounded px-1"
              aria-label="Switch to sign up form"
              data-testid="switch-to-signup"
            >
              Create Account
            </button>
          </p>
          
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
