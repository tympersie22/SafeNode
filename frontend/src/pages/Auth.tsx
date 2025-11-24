import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import LoginForm from '../components/auth/LoginForm'
import SignupForm from '../components/auth/SignupForm'

interface AuthProps {
  onAuthenticated: (userData: any) => void
  onBackToLanding: () => void
  initialMode?: 'signup' | 'login'
}

const Auth: React.FC<AuthProps> = ({ onAuthenticated, onBackToLanding, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  // Update mode when initialMode changes
  useEffect(() => {
    setIsLogin(initialMode === 'login')
  }, [initialMode])

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { login } = await import('../services/authService')
      const result = await login({ email, password })
      
      const userData = {
        ...result.user,
        isNewUser: false
      }
      
      onAuthenticated(userData)
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (signupData: any) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { register } = await import('../services/authService')
      const result = await register({
        email: signupData.email,
        password: signupData.password,
        displayName: signupData.displayName
      })
      
      const userData = {
        ...result.user,
        isNewUser: true,
        needsMasterPassword: true // Flag to trigger master password setup
      }
      
      onAuthenticated(userData)
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-secondary-50 dark:from-slate-900 dark:via-slate-900 dark:to-secondary-950/20 flex items-center justify-center p-4"
      role="main"
      aria-label="Authentication page"
    >
      <div className="w-full max-w-md">
        {/* Back Button */}
        <motion.button
          onClick={onBackToLanding}
          className="mb-8 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary-500 rounded px-2 py-1"
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          aria-label="Go back to landing page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </motion.button>

        {/* Auth Forms */}
        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <LoginForm
                onLogin={handleLogin}
                onSwitchToSignup={() => setIsLogin(false)}
                isLoading={isLoading}
                error={error || undefined}
              />
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <SignupForm
                onSignup={handleSignup}
                onSwitchToLogin={() => setIsLogin(true)}
                isLoading={isLoading}
                error={error || undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Notice */}
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Your data is encrypted with AES-256-GCM before it leaves your device</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Auth
