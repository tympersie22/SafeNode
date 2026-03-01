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
      className={`border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-950/65 ${className}`}
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
                <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-slate-900 sm:text-[2rem] dark:text-slate-100">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 truncate text-xs uppercase tracking-[0.22em] text-slate-500 sm:text-[11px] dark:text-slate-400">
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
                className="w-full rounded-2xl border border-slate-200 bg-[#f5f6f1] py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
              />
              <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500 lg:flex">
                <span>Cmd</span>
                <span>K</span>
              </div>
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
              className="w-full rounded-2xl border border-slate-200 bg-[#f5f6f1] py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>
        </div>
      )}
    </motion.header>
  )
}
