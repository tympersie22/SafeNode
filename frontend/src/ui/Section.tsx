import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export interface SectionProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  background?: 'white' | 'gray' | 'transparent'
}

export const Section: React.FC<SectionProps> = ({
  children,
  className = '',
  padding = 'md',
  maxWidth = 'xl',
  background = 'white',
}) => {
  const prefersReducedMotion = useReducedMotion()

  const paddingClasses = {
    none: '',
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
    xl: 'py-20',
  }

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  }

  const backgroundClasses = {
    white: 'bg-white dark:bg-gray-900',
    gray: 'bg-gray-50 dark:bg-gray-900',
    transparent: 'bg-transparent',
  }

  const classes = `${paddingClasses[padding]} ${backgroundClasses[background]} ${className}`

  return (
    <motion.section
      className={classes}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${maxWidthClasses[maxWidth]}`}>
        {children}
      </div>
    </motion.section>
  )
}

export default Section

