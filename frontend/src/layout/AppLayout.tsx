import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Navbar } from '../ui'

export interface AppLayoutProps {
  children: ReactNode
  navbarTitle?: string
  navbarLeftActions?: ReactNode
  navbarRightActions?: ReactNode
  className?: string
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  navbarTitle,
  navbarLeftActions,
  navbarRightActions,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 ${className}`}>
      {/* Navbar */}
      {(navbarTitle || navbarLeftActions || navbarRightActions) && (
        <Navbar
          title={navbarTitle}
          leftActions={navbarLeftActions}
          rightActions={navbarRightActions}
        />
      )}

      {/* Main Content */}
      <motion.main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.main>
    </div>
  )
}

export default AppLayout

