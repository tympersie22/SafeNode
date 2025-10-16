import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // TODO: Implement actual login logic
      // For now, simulate login
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock user data
      const userData = {
        email,
        displayName: 'User',
        isNewUser: false
      }
      
      onAuthenticated(userData)
    } catch (err) {
      setError('Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (signupData: any) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // TODO: Implement actual signup logic
      // For now, simulate signup
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock user data
      const userData = {
        email: signupData.email,
        displayName: signupData.displayName,
        isNewUser: true
      }
      
      onAuthenticated(userData)
    } catch (err) {
      setError('Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <motion.button
          onClick={onBackToLanding}
          className="mb-8 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Landing
        </motion.button>

        {/* Auth Forms */}
        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
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
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
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
      </div>
    </div>
  )
}

export default Auth
