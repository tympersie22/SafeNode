import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export type LogoVariant = 'header' | 'hero' | 'footer' | 'unlock' | 'nav' | 'default'

interface LogoProps {
  variant?: LogoVariant
  size?: number | string
  className?: string
  animated?: boolean
}

const sizeMap: Record<LogoVariant, string> = {
  header: 'h-10 w-10',
  hero: 'h-24 w-24',
  footer: 'h-8 w-8',
  unlock: 'h-20 w-20',
  nav: 'h-9 w-9',
  default: 'h-12 w-12'
}

const Logo: React.FC<LogoProps> = ({
  variant = 'default',
  size,
  className = '',
  animated = true
}) => {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animated && !prefersReducedMotion
  const sizeClass = typeof size === 'string' ? size : sizeMap[variant]
  const sizeStyle = typeof size === 'number' ? { width: size, height: size } : undefined

  const animation = shouldAnimate
    ? variant === 'header'
      ? { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 } }
      : variant === 'nav'
        ? { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } }
        : { initial: { opacity: 0, scale: 0.88 }, animate: { opacity: 1, scale: 1 } }
    : { initial: false as const }

  return (
    <motion.svg
      viewBox="0 0 64 64"
      className={`${sizeClass} shrink-0 ${className}`}
      style={sizeStyle}
      role="img"
      aria-label="Safenode"
      whileHover={shouldAnimate ? { scale: 1.04 } : undefined}
      whileTap={shouldAnimate ? { scale: 0.96 } : undefined}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      {...animation}
    >
      <path
        d="M32 3.5 56 13v17.1c0 14.4-9.6 25.8-24 30.4C17.6 55.9 8 44.5 8 30.1V13L32 3.5Z"
        fill="#10251d"
      />
      <path
        d="M21 30.5h22v16H21v-16Zm4.5 0v-5.2a6.5 6.5 0 0 1 13 0v5.2"
        fill="none"
        stroke="#f5f1e8"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="38.5" r="2.7" fill="#72b598" />
      <path d="M32 41v2.5" stroke="#72b598" strokeWidth="2.5" strokeLinecap="round" />
    </motion.svg>
  )
}

export default Logo
