import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  floatingLabel?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  floatingLabel = false,
  type = 'text',
  className = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const hasValue = props.value !== undefined && props.value !== '' && props.value !== null

  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  const baseClasses = 'w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

  const borderClasses = error
    ? 'border-error-500 focus:ring-error-500'
    : 'border-gray-300 dark:border-gray-700'

  const floatingLabelClasses = floatingLabel
    ? `${hasValue || isFocused ? 'pt-6 pb-2' : 'py-3'}`
    : ''

  const inputClasses = `${baseClasses} ${borderClasses} ${floatingLabelClasses} ${leftIcon ? 'pl-10' : ''} ${(rightIcon || isPassword) ? 'pr-10' : ''} ${className}`

  const floatingLabelBaseClasses = 'absolute left-4 transition-all duration-200 pointer-events-none'
  const floatingLabelActiveClasses = hasValue || isFocused
    ? 'top-2 text-xs text-secondary-600 dark:text-secondary-400'
    : 'top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400'

  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className="w-full">
      {label && !floatingLabel && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {props.required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
            {leftIcon}
          </div>
        )}
        {floatingLabel && label && (
          <label
            htmlFor={inputId}
            className={`${floatingLabelBaseClasses} ${floatingLabelActiveClasses} ${error ? 'text-error-500' : ''}`}
          >
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <motion.input
          ref={ref}
          id={inputId}
          type={inputType}
          className={inputClasses}
          whileFocus={{ scale: 1.01 }}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e as any)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e as any)
          }}
          {...(props as any)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary-500 rounded p-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
        {rightIcon && !isPassword && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-error-600 dark:text-error-400"
        >
          {error}
        </motion.p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
