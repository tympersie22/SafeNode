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
  sidebarBrand?: {
    logo?: ReactNode
    title: string
    subtitle?: string
    badge?: string
  }
  sidebarFooter?: {
    title: string
    subtitle?: string
    meta?: ReactNode
    avatar?: ReactNode
  }
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
  sidebarBrand,
  sidebarFooter,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(215,228,214,0.55),_transparent_32%),linear-gradient(180deg,_#f3f4f0_0%,_#eef0eb_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(21,58,41,0.28),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
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
          brand={sidebarBrand}
          footer={sidebarFooter}
        />
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
        <div className="flex h-full min-h-0 flex-col overflow-visible rounded-[32px] border border-white/70 bg-white/65 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/75">
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
          className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.main>
        </div>
      </div>
    </div>
  )
}
