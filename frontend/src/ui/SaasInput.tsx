import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

export interface SaasInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const SaasInput = React.forwardRef<HTMLInputElement, SaasInputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  onDrag,
  onDragStart,
  onDragEnd,
  ...props
}, ref) => {
  const baseClasses = 'w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

  const borderClasses = error
    ? 'border-error-500 focus:ring-error-500'
    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'

  const inputClasses = `${baseClasses} ${borderClasses} ${leftIcon ? 'pl-11' : ''} ${rightIcon ? 'pr-11' : ''} ${fullWidth ? 'w-full' : ''} ${className}`

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <motion.label
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {props.required && <span className="text-error-500 ml-1">*</span>}
        </motion.label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <motion.input
          ref={ref}
          className={inputClasses}
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
          {...(props as any)}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-sm text-error-600 dark:text-error-400 font-medium"
        >
          {error}
        </motion.p>
      )}
      {helperText && !error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-1.5 text-sm text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </motion.p>
      )}
    </div>
  )
})

SaasInput.displayName = 'SaasInput'

