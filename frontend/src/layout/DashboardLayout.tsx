import React, { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {sidebarItems.length > 0 && (
        <SaasSidebar
          items={sidebarItems}
          activeItem={activeSidebarItem}
          onItemClick={(itemId) => {
            onSidebarItemClick?.(itemId)
            setIsSidebarOpen(false)
          }}
          collapsed={sidebarCollapsed}
          isMobileOpen={isSidebarOpen}
          onMobileClose={() => setIsSidebarOpen(false)}
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
            onMenuClick={() => setIsSidebarOpen(true)}
            showMobileMenu={sidebarItems.length > 0}
          />
        )}

        {/* Page Content */}
        <motion.main
          className="flex-1 overflow-y-auto p-4 sm:p-6"
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
