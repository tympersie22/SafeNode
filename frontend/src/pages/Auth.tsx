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
import { login as authLogin, signInWithPasskey, signUpWithPasskey, verifyLoginTwoFactor, getCurrentUser } from '../services/authService'
import { showToast } from '../components/ui/Toast'
import { devLog } from '../utils/debug'
import { ExternalLink, Monitor, ShieldCheck } from 'lucide-react'
import { isDesktopBuild } from '../desktop/integration'
import { beginDesktopAuthorization, listenForDesktopAuthorization } from '../desktop/desktopAuth'

interface AuthProps {
  onBackToHome?: () => void
  initialMode?: 'signup' | 'login'
  onAuthenticated?: () => void
}

const Auth: React.FC<AuthProps> = ({ onBackToHome, initialMode = 'login', onAuthenticated }) => {
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

  const finishAuthentication = () => {
    if (onAuthenticated) onAuthenticated()
    else navigate('/vault', { replace: true })
  }

  useEffect(() => {
    if (!isDesktopBuild()) return
    let active = true
    let unlisten: (() => void) | undefined

    void listenForDesktopAuthorization((result) => {
      if (!active || !result.token) return
      flushSync(() => setAuthUser(result.user, result.token!))
      setIsLoading(false)
      setError(null)
      navigate('/vault', { replace: true })
    }, (desktopError) => {
      if (!active) return
      setIsLoading(false)
      setError(desktopError.message)
    }).then((dispose) => {
      if (active) unlisten = dispose
      else dispose()
    }).catch((listenerError) => {
      if (active) setError(listenerError instanceof Error ? listenerError.message : 'Desktop callback listener failed.')
    })

    return () => {
      active = false
      unlisten?.()
    }
  }, [navigate, setAuthUser])
  
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
            // Token is already stored by handleSSOCallback
            // Fetch user profile to populate auth context
            const user = await getCurrentUser()
            setAuthUser(user, result.token)
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
      devLog('[Auth] Login successful, updating auth context')
      
      // Use flushSync to ensure state updates synchronously before navigation
      flushSync(() => {
        setAuthUser(result.user, result.token!)
      })
      devLog('[Auth] Auth context updated synchronously')

      setIsLoading(false)
      isProcessingRef.current = false

      finishAuthentication()
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid email or password. Please try again.';
      setError(errorMsg);
      showToast.error(errorMsg);
      setIsLoading(false)
      isProcessingRef.current = false
    }
  }

  const handlePasskeyLogin = async (email: string) => {
    if (isProcessingRef.current || isLoading || isAuthenticated) {
      return
    }

    isProcessingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await signInWithPasskey(email)
      if (result.user && result.user.hasVault === false) {
        sessionStorage.setItem('safenode_passkey_bootstrap_pending', '1')
      } else {
        sessionStorage.removeItem('safenode_passkey_bootstrap_pending')
      }

      flushSync(() => {
        setAuthUser(result.user, result.token!)
      })

      setIsLoading(false)
      isProcessingRef.current = false
      finishAuthentication()
    } catch (err: any) {
      const errorMsg = err.message || 'Passkey sign-in failed. Please try again.'
      setError(errorMsg)
      showToast.error(errorMsg)
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
      finishAuthentication()
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
      const result = await signUpWithPasskey({
        email: signupData.email,
        displayName: signupData.displayName
      })
      devLog('[Auth] Signup successful, updating auth context')
      sessionStorage.setItem('safenode_passkey_bootstrap_pending', '1')
      
      // Use flushSync to ensure state updates synchronously before navigation
      flushSync(() => {
        setAuthUser(result.user, result.token!)
      })
      devLog('[Auth] Auth context updated synchronously')

      setIsLoading(false)
      isProcessingRef.current = false

      finishAuthentication()
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.')
      setIsLoading(false)
      isProcessingRef.current = false
    }
  }

  if (isDesktopBuild()) {
    const continueInBrowser = async () => {
      setIsLoading(true)
      setError(null)
      try {
        await beginDesktopAuthorization()
      } catch (err: any) {
        setError(err?.message || 'Could not open the secure browser flow.')
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <main className="sn-page relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
        <div className="sn-hero-grid" aria-hidden="true" />
        <section className="relative w-full max-w-2xl border border-[var(--sn-line)] bg-[var(--sn-surface)] p-8 sm:p-12">
          <div className="flex h-12 w-12 items-center justify-center border border-[var(--sn-line)] text-[var(--sn-accent)]">
            <Monitor className="h-6 w-6" />
          </div>
          <p className="sn-eyebrow mt-8">Secure desktop access</p>
          <h1 className="sn-display mt-5">Use your passkey on safe-node.app.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--sn-muted)]">
            Safenode opens its canonical domain for passkey verification, then returns a short-lived one-time authorization to this app.
          </p>

          <div className="mt-8 grid gap-3 border-y border-[var(--sn-line)] py-6 text-sm text-[var(--sn-muted)] sm:grid-cols-2">
            <span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[var(--sn-accent)]" /> No vault secrets exposed to desktop IPC</span>
            <span className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[var(--sn-accent)]" /> Passkeys stay bound to safe-node.app</span>
          </div>

          {error && <p className="mt-6 border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

          <button type="button" onClick={continueInBrowser} disabled={isLoading} className="sn-solid-button mt-8 w-full sm:w-auto">
            {isLoading ? 'Waiting for browser approval…' : 'Continue securely in browser'}
            <ExternalLink className="h-4 w-4" />
          </button>
          <p className="mt-5 text-xs leading-5 text-[var(--sn-muted)]">
            Keep this app open. The request expires after five minutes and cannot be reused.
          </p>
        </section>
      </main>
    )
  }

  // Note: We don't return null here anymore - let the parent component handle unmounting
  // The parent (App.tsx) will unmount this component when user is set

  return (
    <div
      className="sn-page grid min-h-screen lg:grid-cols-[0.85fr_1.15fr]"
      role="main"
      aria-label="Authentication page"
    >
      <aside className="relative hidden overflow-hidden bg-[var(--sn-ink-fixed,#14201b)] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="sn-hero-grid opacity-20" aria-hidden="true" />
        <button onClick={onBackToHome} className="relative inline-flex w-fit items-center gap-3 text-sm font-semibold text-white/65 transition-colors hover:text-white">
          <span aria-hidden="true">←</span> Safenode home
        </button>
        <div className="relative max-w-xl">
          <p className="sn-eyebrow text-[var(--sn-accent-soft)]">Identity boundary</p>
          <h1 className="sn-display mt-7 text-white">Access should be proven, not remembered.</h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-white/55">
            Your passkey proves who you are. Your vault key remains on your device. Recovery stays explicit and under your control.
          </p>
        </div>
        <div className="relative grid grid-cols-3 border-t border-white/15 pt-6 text-xs text-white/42">
          <span>Passkey first</span>
          <span>Zero knowledge</span>
          <span>Recovery ready</span>
        </div>
      </aside>

      <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-[520px]">
        {/* Back Button */}
        <motion.button
          onClick={onBackToHome}
          className="mb-8 flex items-center gap-2 text-sm font-semibold text-[var(--sn-muted)] transition-colors hover:text-[var(--sn-ink)] lg:hidden"
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
              className="sn-auth-card"
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
                onPasskeyLogin={handlePasskeyLogin}
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
                  devLog('[Auth] Switching to login mode')
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
          className="mt-7 border-t border-[var(--sn-line)] pt-5 text-center"
        >
          <div className="inline-flex items-center gap-2 text-xs text-[var(--sn-muted)]">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Your data is encrypted with AES-256-GCM before it leaves your device</span>
          </div>
        </motion.div>
      </div>
      </div>
    </div>
  )
}

export default Auth
