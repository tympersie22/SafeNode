import React from 'react'
import { motion } from 'framer-motion'

export interface SaasTopbarProps {
  title?: string
  subtitle?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  className?: string
  search?: {
    placeholder?: string
    value: string
    onChange: (value: string) => void
  }
}

export const SaasTopbar: React.FC<SaasTopbarProps> = ({
  title,
  subtitle,
  leftContent,
  rightContent,
  className = '',
  search,
}) => {
  return (
    <motion.header
      className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 ${className}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-4 flex-1">
          {leftContent}
          {(title || subtitle) && (
            <div>
              {title && (
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        {search && (
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={search.placeholder || 'Search...'}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        )}

        {/* Right */}
        {rightContent && (
          <div className="flex items-center gap-2">
            {rightContent}
          </div>
        )}
      </div>
    </motion.header>
  )
}

