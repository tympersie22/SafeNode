import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Logo from '../components/Logo'

export interface NavbarProps {
  logo?: React.ReactNode
  title?: string
  leftActions?: React.ReactNode
  rightActions?: React.ReactNode
  className?: string
}

export const Navbar: React.FC<NavbarProps> = ({
  logo,
  title,
  leftActions,
  rightActions,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.nav
      className={`sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 ${className}`}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {logo || <Logo variant="header" />}
            {title && (
              <h1 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-secondary-600 dark:from-white dark:to-secondary-400 bg-clip-text text-transparent">
                {title}
              </h1>
            )}
            {leftActions}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {rightActions}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar

