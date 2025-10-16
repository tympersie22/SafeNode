import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../ui/Button'

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
  securityQuestion: string
  securityAnswer: string
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
    displayName: '',
    securityQuestion: '',
    securityAnswer: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const securityQuestions = [
    'What was the name of your first pet?',
    'What city were you born in?',
    'What was your mother\'s maiden name?',
    'What was the name of your elementary school?',
    'What was your childhood nickname?'
  ]

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
    onSignup(formData)
  }

  const isFormValid = formData.email && 
    formData.password && 
    formData.confirmPassword && 
    formData.displayName && 
    formData.securityQuestion && 
    formData.securityAnswer &&
    formData.password === formData.confirmPassword &&
    passwordStrength >= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm"
    >
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Create account
        </h2>
        <p className="text-slate-600">Set up your secure password vault</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            placeholder="Enter your display name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Master Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className="w-full px-4 py-3 pr-12 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 shadow-sm"
              placeholder="Create a strong master password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
          </div>
          
          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded ${
                      level <= passwordStrength
                        ? passwordStrength <= 2
                          ? 'bg-red-400'
                          : passwordStrength <= 4
                          ? 'bg-yellow-400'
                          : 'bg-green-400'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 4 ? 'Good' : 'Strong'} password
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full px-4 py-3 pr-12 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 shadow-sm"
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirmPassword ? (
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
          </div>
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Security Question
          </label>
          <select
            value={formData.securityQuestion}
            onChange={(e) => handleInputChange('securityQuestion', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            required
          >
            <option value="">Select a security question</option>
            {securityQuestions.map((question, index) => (
              <option key={index} value={question}>
                {question}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Security Answer
          </label>
          <input
            type="text"
            value={formData.securityAnswer}
            onChange={(e) => handleInputChange('securityAnswer', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            placeholder="Enter your answer"
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={isLoading}
          disabled={!isFormValid}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-slate-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            Sign In
          </button>
        </p>
      </div>
    </motion.div>
  )
}

export default SignupForm
