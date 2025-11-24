import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export interface SaasButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  isLoading?: boolean // Alias for loading for backward compatibility
  fullWidth?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  children: React.ReactNode
}

export const SaasButton: React.FC<SaasButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading,
  fullWidth = false,
  disabled,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  ...props
}) => {
  // Support both loading and isLoading for backward compatibility
  const isActuallyLoading = loading || isLoading || false
  const prefersReducedMotion = useReducedMotion()

  const baseClasses = `inline-flex items-center justify-center gap-2 font-semibold rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden ${fullWidth ? 'w-full' : ''}`

  const variantClasses = {
    primary: 'bg-gradient-to-r from-secondary-600 to-secondary-500 text-white shadow-safenode-secondary hover:shadow-safenode-secondary-lg focus-visible:ring-secondary-500',
    secondary: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-safenode hover:shadow-safenode-md focus-visible:ring-gray-500',
    outline: 'border-2 border-secondary-500 text-secondary-600 dark:text-secondary-400 bg-transparent hover:bg-secondary-50 dark:hover:bg-secondary-900/20 focus-visible:ring-secondary-500',
    ghost: 'text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-gray-500',
    danger: 'bg-error-500 text-white shadow-safenode hover:bg-error-600 focus-visible:ring-error-500',
    gradient: 'bg-gradient-to-r from-secondary-600 via-secondary-500 to-secondary-600 text-white shadow-safenode-secondary-lg hover:shadow-safenode-secondary-lg focus-visible:ring-secondary-500 bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-500',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  const iconElement = icon && !loading && (
    <span className={iconPosition === 'right' ? 'order-2' : ''}>{icon}</span>
  )

  return (
    <motion.button
      className={classes}
      disabled={disabled || isActuallyLoading}
      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
      {...(props as any)}
    >
      {isActuallyLoading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isActuallyLoading && iconPosition === 'left' && iconElement}
      <span>{children}</span>
      {!isActuallyLoading && iconPosition === 'right' && iconElement}
    </motion.button>
  )
}

