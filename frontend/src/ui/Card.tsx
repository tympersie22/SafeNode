import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  onClick,
}) => {
  const prefersReducedMotion = useReducedMotion()

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const baseClasses = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-safenode'

  const hoverClasses = hover
    ? 'cursor-pointer transition-all duration-200 hover:shadow-safenode-lg hover:border-secondary-300 dark:hover:border-secondary-700'
    : ''

  const classes = `${baseClasses} ${paddingClasses[padding]} ${hoverClasses} ${className}`

  const Component = onClick ? motion.div : motion.div

  return (
    <Component
      className={classes}
      onClick={onClick}
      whileHover={hover && !prefersReducedMotion ? { y: -2 } : {}}
      whileTap={onClick && !prefersReducedMotion ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </Component>
  )
}

export default Card

