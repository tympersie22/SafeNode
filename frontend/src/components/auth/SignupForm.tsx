import React, { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Button from '../../ui/Button'
import Input from '../../ui/Input'
import PasswordInput from '../ui/PasswordInput'
import SocialAuthButtons from './SocialAuthButtons'

interface SignupFormProps {
  onSignup: (userData: SignupData) => void
  onSwitchToLogin: () => void
  isLoading?: boolean
  error?: string
}

interface SignupData {
  email: string
  password: string
  confirmPassword: string
  displayName: string
}

const SignupForm: React.FC<SignupFormProps> = ({ 
  onSignup, 
  onSwitchToLogin, 
  isLoading = false, 
  error 
}) => {
  const [formData, setFormData] = useState<SignupData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const displayNameRef = useRef<HTMLInputElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Focus first input on mount
  useEffect(() => {
    displayNameRef.current?.focus()
  }, [])


  const calculatePasswordStrength = (password: string) => {
    let score = 0
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[a-z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
    return score
  }

  const handleInputChange = (field: keyof SignupData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      return
    }
    // Only send email, password, and displayName to backend
    onSignup({
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      displayName: formData.displayName
    })
  }

  const isFormValid = formData.email && 
    formData.password && 
    formData.confirmPassword && 
    formData.displayName &&
    formData.password === formData.confirmPassword &&
    passwordStrength >= 3 &&
    formData.password.length >= 8

  const passwordStrengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const passwordStrengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500'
  ]

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg"
      role="main"
      aria-labelledby="signup-heading"
    >
      <div className="text-center mb-8">
        <div 
          className="w-14 h-14 bg-gray-950 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gray-950/10"
          aria-hidden="true"
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 
          id="signup-heading"
            className="text-3xl font-bold text-gray-900 mb-2"
        >
          Create your account
        </h2>
        <p className="text-gray-600">
          Start securing your digital life with AI-powered protection
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
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        </motion.div>
      )}

      <form 
        onSubmit={handleSubmit} 
        className="space-y-6"
        aria-label="Sign up form"
        noValidate
      >
        <Input
          id="signup-display-name"
          ref={displayNameRef}
          type="text"
          label="Display Name"
          value={formData.displayName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('displayName', e.target.value)}
          onFocus={() => setFocusedField('displayName')}
          onBlur={() => setFocusedField(null)}
          placeholder="John Doe"
          required
          autoComplete="name"
        />

        <Input
          id="signup-email"
          type="email"
          label="Email Address"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />

        <div>
          <PasswordInput
            id="signup-password"
            label="Master Password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            placeholder="Create a strong master password"
            required
            showStrength={true}
          />
        </div>

        <PasswordInput
          id="signup-confirm-password"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          onFocus={() => setFocusedField('confirmPassword')}
          onBlur={() => setFocusedField(null)}
          placeholder="Confirm your password"
          required
          error={formData.confirmPassword && formData.password !== formData.confirmPassword ? "Passwords do not match" : undefined}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={isLoading}
          disabled={!isFormValid || isLoading}
          aria-label={isLoading ? "Creating account, please wait" : "Create your SafeNode account"}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <SocialAuthButtons mode="signup" disabled={isLoading} />

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-gray-900 hover:text-gray-700 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 rounded px-1 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900"
              aria-label="Switch to sign in form"
              data-testid="switch-to-login"
            >
              Sign In
            </button>
          </p>

          <div className="flex flex-col items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>AES-256-GCM encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Zero-knowledge architecture</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              <span>After signup, enable Touch ID or Face ID for faster access</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default SignupForm
