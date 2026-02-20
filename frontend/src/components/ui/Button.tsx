import React from 'react'
import { motion } from 'framer-motion'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
  title?: string
  ariaLabel?: string
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  title,
  ariaLabel,
}) => {
  const baseClasses = 'btn inline-flex items-center justify-center gap-2 font-medium select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2'

  const variantClasses = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    secondary: 'btn-secondary',
    danger: 'btn-danger'
  }

  const sizeClasses = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  }

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none' : ''} ${className}`

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      whileHover={disabled || loading ? undefined : { scale: 1.01 }}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      title={title}
      aria-label={ariaLabel}
      {...({} as any)}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  )
}

export default Button
