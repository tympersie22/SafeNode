import React, { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm'
import SignupForm from '../components/auth/SignupForm'
import { handleSSOCallback, isSSOCallback } from '../services/ssoService'
import { useAuth } from '../contexts/AuthContext'
import Input from '../ui/Input'
import Button from '../components/ui/Button'
import { login as authLogin, register as authRegister, verifyLoginTwoFactor } from '../services/authService'
import { showToast } from '../components/ui/Toast'

interface AuthProps {
  onBackToHome?: () => void
  initialMode?: 'signup' | 'login'
}

const Auth: React.FC<AuthProps> = ({ onBackToHome, initialMode = 'login' }) => {
  const { login: setAuthUser, isAuthenticated } = useAuth()
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingTwoFactor, setPendingTwoFactor] = useState<{ email: string; password: string; displayName?: string; useBackupCode: boolean } | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const isProcessingRef = useRef(false)
  const prefersReducedMotion = useReducedMotion()
  const location = useLocation()
  const navigate = useNavigate()
  
  // NO NAVIGATION - PublicRoute handles redirects for authenticated users

  // Update mode when initialMode changes
  useEffect(() => {
    setIsLogin(initialMode === 'login')
  }, [initialMode])

  // Handle SSO callback
  useEffect(() => {
    const handleSSO = async () => {
      if (isSSOCallback() && !isProcessingRef.current && !isAuthenticated) {
        isProcessingRef.current = true
        setIsLoading(true)
        setError(null)
        
        try {
          const result = await handleSSOCallback()
          if (result) {
            // SSO callback returns { token, userId, user }
            // Token is already stored by handleSSOCallback
            // Use user data from result directly - NO getCurrentUser call
            if (result.user && result.token) {
              setAuthUser(result.user, result.token)
            }
            setIsLoading(false)
            // NO NAVIGATION - PublicRoute will redirect authenticated users to /vault
          } else {
            setIsLoading(false)
            isProcessingRef.current = false
          }
        } catch (err: any) {
          const errorMsg = err.message || 'SSO authentication failed. Please try again.';
          setError(errorMsg);
          showToast.error(errorMsg);
          setIsLoading(false)
          isProcessingRef.current = false
          // NO NAVIGATION - User stays on /auth on error
        }
      }
    }

    handleSSO()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navigate, isAuthenticated, setAuthUser])

  const handleLogin = async (email: string, password: string) => {
    // Prevent double submission
    if (isProcessingRef.current || isLoading || isAuthenticated) {
      return
    }
    
    isProcessingRef.current = true
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await authLogin({ email, password })
      if (result.requiresTwoFactor) {
        setPendingTwoFactor({
          email,
          password,
          displayName: result.user?.displayName,
          useBackupCode: false
        })
        setTwoFactorCode('')
        setIsLoading(false)
        isProcessingRef.current = false
        return
      }
      console.log('[Auth] Login successful, updating auth context')
      
      // Use flushSync to ensure state updates synchronously before navigation
      flushSync(() => {
        setAuthUser(result.user, result.token)
      })
      console.log('[Auth] Auth context updated synchronously')
      
      setIsLoading(false)
      isProcessingRef.current = false
      
      // NO NAVIGATION - PublicRoute will redirect authenticated users to /vault
      // This ensures route guards own all navigation decisions
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid email or password. Please try again.';
      setError(errorMsg);
      showToast.error(errorMsg);
      setIsLoading(false)
      isProcessingRef.current = false
    }
  }

  const handleVerifyTwoFactor = async () => {
    if (!pendingTwoFactor || !twoFactorCode.trim() || isLoading) {
      return
    }

    isProcessingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await verifyLoginTwoFactor({
        email: pendingTwoFactor.email,
        password: pendingTwoFactor.password,
        ...(pendingTwoFactor.useBackupCode ? { backupCode: twoFactorCode.trim() } : { code: twoFactorCode.trim() })
      })

      flushSync(() => {
        setAuthUser(result.user, result.token!)
      })

      setPendingTwoFactor(null)
      setTwoFactorCode('')
      setIsLoading(false)
      isProcessingRef.current = false
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid 2FA code. Please try again.'
      setError(errorMsg)
      showToast.error(errorMsg)
      setIsLoading(false)
      isProcessingRef.current = false
    }
  }

  const handleSignup = async (signupData: any) => {
    // Prevent double submission
    if (isProcessingRef.current || isLoading || isAuthenticated) {
      return
    }
    
    isProcessingRef.current = true
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await authRegister({
        email: signupData.email,
        password: signupData.password,
        displayName: signupData.displayName
      })
      console.log('[Auth] Signup successful, updating auth context')
      
      // Use flushSync to ensure state updates synchronously before navigation
      flushSync(() => {
        setAuthUser(result.user, result.token)
      })
      console.log('[Auth] Auth context updated synchronously')
      
      setIsLoading(false)
      isProcessingRef.current = false
      
      // NO NAVIGATION - PublicRoute will redirect authenticated users to /vault
      // This ensures route guards own all navigation decisions
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.')
      setIsLoading(false)
      isProcessingRef.current = false
    }
  }

  // Note: We don't return null here anymore - let the parent component handle unmounting
  // The parent (App.tsx) will unmount this component when user is set

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4"
      role="main"
      aria-label="Authentication page"
    >
      <div className="w-full max-w-md">
        {/* Back Button */}
        <motion.button
          onClick={onBackToHome}
          className="mb-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 rounded px-2 py-1"
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          aria-label="Go back to home page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back to Home</span>
        </motion.button>

        {/* Auth Forms */}
        <AnimatePresence mode="wait">
          {pendingTwoFactor ? (
            <motion.div
              key="twofactor"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify second factor</h2>
                <p className="text-gray-600">
                  Enter the {pendingTwoFactor.useBackupCode ? 'backup code' : 'code from your authenticator app'} for {pendingTwoFactor.email}.
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <Input
                  id="twofactor-code"
                  label={pendingTwoFactor.useBackupCode ? 'Backup Code' : 'Authentication Code'}
                  value={twoFactorCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTwoFactorCode(e.target.value)}
                  placeholder={pendingTwoFactor.useBackupCode ? 'Enter backup code' : '123456'}
                  autoComplete="one-time-code"
                />

                <div className="flex gap-3">
                  <Button
                    onClick={handleVerifyTwoFactor}
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    loading={isLoading}
                    disabled={!twoFactorCode.trim() || isLoading}
                  >
                    Verify and Sign In
                  </Button>
                  <Button
                    onClick={() => {
                      setPendingTwoFactor((current) => current ? { ...current, useBackupCode: !current.useBackupCode } : current)
                      setTwoFactorCode('')
                      setError(null)
                    }}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    Use {pendingTwoFactor.useBackupCode ? 'authenticator' : 'backup'} code
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    setPendingTwoFactor(null)
                    setTwoFactorCode('')
                    setError(null)
                    setIsLoading(false)
                    isProcessingRef.current = false
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  Back to password sign-in
                </Button>
              </div>
            </motion.div>
          ) : isLogin ? (
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
                onSwitchToLogin={() => {
                  console.log('[Auth] Switching to login mode')
                  setIsLogin(true)
                }}
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
