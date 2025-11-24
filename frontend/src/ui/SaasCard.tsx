import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export interface SaasCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  onClick?: () => void
  gradient?: boolean
  glass?: boolean
}

export const SaasCard: React.FC<SaasCardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  onClick,
  gradient = false,
  glass = false,
}) => {
  const prefersReducedMotion = useReducedMotion()

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  }

  const baseClasses = 'rounded-2xl shadow-safenode transition-all duration-300'
  
  const backgroundClasses = glass
    ? 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/20'
    : gradient
    ? 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700'
    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'

  const hoverClasses = hover
    ? 'cursor-pointer hover:shadow-safenode-xl hover:-translate-y-1 hover:border-secondary-300 dark:hover:border-secondary-700'
    : ''

  const classes = `${baseClasses} ${backgroundClasses} ${paddingClasses[padding]} ${hoverClasses} ${className}`

  return (
    <motion.div
      className={classes}
      onClick={onClick}
      whileHover={hover && !prefersReducedMotion ? { y: -4, scale: 1.01 } : {}}
      whileTap={onClick && !prefersReducedMotion ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

