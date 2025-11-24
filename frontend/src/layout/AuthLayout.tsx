import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'

export interface AuthLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  illustration?: ReactNode
  className?: string
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  illustration,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 ${className}`}>
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left: Illustration */}
        {illustration && (
          <motion.div
            className="hidden md:flex items-center justify-center"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full max-w-md">
              {illustration}
            </div>
          </motion.div>
        )}

        {/* Right: Form */}
        <motion.div
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-safenode-xl border border-gray-200 dark:border-gray-700 p-8">
            {(title || subtitle) && (
              <div className="mb-8 text-center">
                {title && (
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

