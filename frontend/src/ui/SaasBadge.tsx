import React from 'react'
import { motion } from 'framer-motion'

export interface SaasBadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'gray'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  dot?: boolean
}

export const SaasBadge: React.FC<SaasBadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantClasses = {
    primary: 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 border-secondary-200 dark:border-secondary-800',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    success: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800',
    error: 'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300 border-error-200 dark:border-error-800',
    warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-800',
    info: 'bg-info-100 dark:bg-info-900/30 text-info-700 dark:text-info-300 border-info-200 dark:border-info-800',
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }

  const classes = `inline-flex items-center gap-1.5 font-medium rounded-lg border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  return (
    <motion.span
      className={classes}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {dot && (
        <span className={`${dotSizeClasses[size]} rounded-full bg-current opacity-75`} />
      )}
      {children}
    </motion.span>
  )
}

