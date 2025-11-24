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
}

export const SaasSidebar: React.FC<SaasSidebarProps> = ({
  items,
  activeItem,
  onItemClick,
  className = '',
  collapsed = false,
}) => {
  return (
    <aside className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 ${className}`}>
      <nav className="p-4 space-y-1">
        {items.map((item) => {
          const isActive = activeItem === item.id || item.active
          return (
            <motion.button
              key={item.id}
              onClick={() => {
                item.onClick?.()
                onItemClick?.(item.id)
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              {item.icon && (
                <span className={`flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`}>
                  {item.icon}
                </span>
              )}
              {!collapsed && (
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
        })}
      </nav>
    </aside>
  )
}

