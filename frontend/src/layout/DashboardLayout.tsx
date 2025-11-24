import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { SaasSidebar, SidebarItem } from '../ui/SaasSidebar'
import { SaasTopbar } from '../ui/SaasTopbar'

export interface DashboardLayoutProps {
  children: ReactNode
  sidebarItems?: SidebarItem[]
  activeSidebarItem?: string
  onSidebarItemClick?: (itemId: string) => void
  topbarTitle?: string
  topbarSubtitle?: string
  topbarLeftContent?: ReactNode
  topbarRightContent?: ReactNode
  topbarSearch?: {
    placeholder?: string
    value: string
    onChange: (value: string) => void
  }
  sidebarCollapsed?: boolean
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  sidebarItems = [],
  activeSidebarItem,
  onSidebarItemClick,
  topbarTitle,
  topbarSubtitle,
  topbarLeftContent,
  topbarRightContent,
  topbarSearch,
  sidebarCollapsed = false,
}) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      {sidebarItems.length > 0 && (
        <SaasSidebar
          items={sidebarItems}
          activeItem={activeSidebarItem}
          onItemClick={onSidebarItemClick}
          collapsed={sidebarCollapsed}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        {(topbarTitle || topbarSubtitle || topbarLeftContent || topbarRightContent || topbarSearch) && (
          <SaasTopbar
            title={topbarTitle}
            subtitle={topbarSubtitle}
            leftContent={topbarLeftContent}
            rightContent={topbarRightContent}
            search={topbarSearch}
          />
        )}

        {/* Page Content */}
        <motion.main
          className="flex-1 overflow-y-auto p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}

