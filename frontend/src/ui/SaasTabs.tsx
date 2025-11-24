import React, { useState } from 'react'
import { motion } from 'framer-motion'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  content: React.ReactNode
}

export interface SaasTabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  className?: string
  variant?: 'default' | 'pills' | 'underline'
}

export const SaasTabs: React.FC<SaasTabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  className = '',
  variant = 'default',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onChange?.(tabId)
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  const variantClasses = {
    default: 'border-b border-gray-200 dark:border-gray-700',
    pills: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-xl',
    underline: 'border-b border-gray-200 dark:border-gray-700',
  }

  return (
    <div className={className}>
      {/* Tab List */}
      <div className={`flex gap-1 ${variantClasses[variant]}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                relative px-4 py-2.5 text-sm font-medium transition-colors duration-200
                ${variant === 'pills' 
                  ? `rounded-lg ${isActive ? 'bg-white dark:bg-gray-700 text-secondary-600 dark:text-secondary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`
                  : isActive
                  ? 'text-secondary-600 dark:text-secondary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
              </span>
              {variant === 'underline' && isActive && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary-600 dark:bg-secondary-400"
                  layoutId="activeTab"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="mt-6"
      >
        {activeTabContent}
      </motion.div>
    </div>
  )
}

