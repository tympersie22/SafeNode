import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export type LogoVariant = 'header' | 'hero' | 'footer' | 'unlock' | 'nav' | 'default'

interface LogoProps {
  variant?: LogoVariant
  size?: number | string
  className?: string
  animated?: boolean
}

const Logo: React.FC<LogoProps> = ({ 
  variant = 'default', 
  size,
  className = '',
  animated = true 
}) => {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animated && !prefersReducedMotion

  // Size mapping based on variant - adjusted for each context
  const sizeMap: Record<LogoVariant, string> = {
    header: 'w-10 h-10',      // Header: slightly larger for visibility
    hero: 'w-24 h-24',        // Hero: large and prominent
    footer: 'w-8 h-8',        // Footer: compact
    unlock: 'w-20 h-20',      // Unlock: medium-large for focus
    nav: 'w-9 h-9',           // Navigation: medium
    default: 'w-12 h-12'      // Default: medium
  }

  // Rounded corners based on variant - larger logos get more rounding
  const roundedMap: Record<LogoVariant, string> = {
    header: 'rounded-lg',     // Header: medium rounding
    hero: 'rounded-2xl',      // Hero: larger rounding for prominence
    footer: 'rounded-md',     // Footer: subtle rounding
    unlock: 'rounded-xl',     // Unlock: nice rounded look
    nav: 'rounded-lg',        // Navigation: medium rounding
    default: 'rounded-lg'     // Default: medium rounding
  }

  // Custom size if provided
  const sizeClass = size 
    ? typeof size === 'number' 
      ? `w-${size} h-${size}` 
      : size
    : sizeMap[variant]

  const roundedClass = roundedMap[variant]

  // Clean base classes with rounded corners
  const baseClasses = `${sizeClass} ${roundedClass} object-contain ${className}`

  if (!shouldAnimate) {
    return (
      <img 
        src="/SafeNodelogo.png"
        alt="SafeNode Logo"
        className={baseClasses}
        aria-hidden="true"
      />
    )
  }

  // Animation configurations per variant - clean and context-appropriate
  switch (variant) {
    case 'header':
      return (
        <motion.img
          src="/SafeNodelogo.png"
          alt="SafeNode Logo"
          className={baseClasses}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 17,
            duration: 0.5,
            delay: 0.1
          }}
          aria-hidden="true"
        />
      )

    case 'hero':
      return (
        <motion.img
          src="/SafeNodelogo.png"
          alt="SafeNode Logo"
          className={baseClasses}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut"
          }}
          aria-hidden="true"
        />
      )

    case 'footer':
      return (
        <motion.img
          src="/SafeNodelogo.png"
          alt="SafeNode Logo"
          className={baseClasses}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          aria-hidden="true"
        />
      )

    case 'unlock':
      return (
        <motion.img
          src="/SafeNodelogo.png"
          alt="SafeNode Logo"
          className={baseClasses}
          initial={{ rotate: -8, opacity: 0, scale: 0.9 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15,
            duration: 0.5
          }}
          aria-hidden="true"
        />
      )

    case 'nav':
      return (
        <motion.img
          src="/SafeNodelogo.png"
          alt="SafeNode Logo"
          className={baseClasses}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          aria-hidden="true"
        />
      )

    default:
      return (
        <motion.img
          src="/SafeNodelogo.png"
          alt="SafeNode Logo"
          className={baseClasses}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          aria-hidden="true"
        />
      )
  }
}

export default Logo
