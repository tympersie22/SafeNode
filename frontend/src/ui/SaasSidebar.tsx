import React from 'react'
import { motion } from 'framer-motion'

export interface SidebarItem {
  id: string
  label: string
  icon?: React.ReactNode
  href?: string
  onClick?: () => void
  badge?: string | number
  active?: boolean
}

export interface SaasSidebarProps {
  items: SidebarItem[]
  activeItem?: string
  onItemClick?: (itemId: string) => void
  className?: string
  collapsed?: boolean
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export const SaasSidebar: React.FC<SaasSidebarProps> = ({
  items,
  activeItem,
  onItemClick,
  className = '',
  collapsed = false,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const renderNavItems = (isMobile: boolean) =>
    items.map((item) => {
      const isActive = activeItem === item.id || item.active
      return (
        <motion.button
          key={item.id}
          onClick={() => {
            item.onClick?.()
            onItemClick?.(item.id)
            if (isMobile) onMobileClose?.()
          }}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
            ${isMobile ? 'min-h-[44px]' : ''}
            ${isActive
              ? 'bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
          whileHover={isMobile ? {} : { x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          {item.icon && (
            <span className={`flex-shrink-0 ${!isMobile && collapsed ? 'mx-auto' : ''}`}>
              {item.icon}
            </span>
          )}
          {(isMobile || !collapsed) && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </motion.button>
      )
    })

  return (
    <>
      {/* Desktop Sidebar — always visible on md+ */}
      <aside
        className={`
          hidden md:block
          bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
          h-full
          ${collapsed ? 'w-16' : 'w-64'}
          transition-all duration-300
          ${className}
        `}
      >
        <nav className="p-4 space-y-1">
          {renderNavItems(false)}
        </nav>
      </aside>

      {/* Mobile Sidebar Drawer — slides in from left */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isMobileOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`
          md:hidden
          fixed inset-y-0 left-0 z-50
          bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
          w-64 shadow-xl
          ${className}
        `}
      >
        {/* Mobile sidebar header with close button */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu</span>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {renderNavItems(true)}
        </nav>
      </motion.aside>
    </>
  )
}
