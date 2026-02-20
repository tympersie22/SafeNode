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
  onMenuClick?: () => void
  showMobileMenu?: boolean
}

export const SaasTopbar: React.FC<SaasTopbarProps> = ({
  title,
  subtitle,
  leftContent,
  rightContent,
  className = '',
  search,
  onMenuClick,
  showMobileMenu = false,
}) => {
  return (
    <motion.header
      className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 ${className}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile menu button + Title */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          {/* Hamburger for mobile */}
          {showMobileMenu && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
              aria-label="Open sidebar menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          {leftContent}
          {(title || subtitle) && (
            <div className="min-w-0">
              {title && (
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Search — hidden on xs, shown on sm+ */}
        {search && (
          <div className="hidden sm:flex flex-1 max-w-md">
            <div className="relative w-full">
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
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>
        )}

        {/* Right */}
        {rightContent && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {rightContent}
          </div>
        )}
      </div>

      {/* Mobile Search — full width below on xs screens */}
      {search && (
        <div className="sm:hidden mt-3">
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
    </motion.header>
  )
}
