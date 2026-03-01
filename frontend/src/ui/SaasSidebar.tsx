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
  section?: string
  description?: string
}

interface SidebarBrand {
  logo?: React.ReactNode
  title: string
  subtitle?: string
  badge?: string
}

interface SidebarFooter {
  title: string
  subtitle?: string
  meta?: React.ReactNode
  avatar?: React.ReactNode
}

export interface SaasSidebarProps {
  items: SidebarItem[]
  activeItem?: string
  onItemClick?: (itemId: string) => void
  className?: string
  collapsed?: boolean
  isMobileOpen?: boolean
  onMobileClose?: () => void
  brand?: SidebarBrand
  footer?: SidebarFooter
}

export const SaasSidebar: React.FC<SaasSidebarProps> = ({
  items,
  activeItem,
  onItemClick,
  className = '',
  collapsed = false,
  isMobileOpen = false,
  onMobileClose,
  brand,
  footer,
}) => {
  const groupedItems = items.reduce<Record<string, SidebarItem[]>>((groups, item) => {
    const section = item.section || 'Workspace'
    groups[section] = groups[section] || []
    groups[section].push(item)
    return groups
  }, {})

  const renderNavItems = (isMobile: boolean) =>
    Object.entries(groupedItems).map(([section, sectionItems]) => (
      <div key={section} className="space-y-2">
        {(isMobile || !collapsed) && (
          <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {section}
          </div>
        )}
        <div className="space-y-1.5">
          {sectionItems.map((item) => {
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
            w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-200 border
            ${isMobile ? 'min-h-[44px]' : ''}
            ${isActive
              ? 'bg-[#eff8ef] dark:bg-emerald-950/40 text-slate-900 dark:text-slate-100 border-emerald-200 dark:border-emerald-900 shadow-[0_12px_35px_rgba(25,85,48,0.08)]'
              : 'text-slate-600 dark:text-slate-300 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
            }
          `}
          whileHover={isMobile ? {} : { x: 3 }}
          whileTap={{ scale: 0.98 }}
        >
          {item.icon && (
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${isActive ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300'} ${!isMobile && collapsed ? 'mx-auto' : ''}`}>
              {item.icon}
            </span>
          )}
          {(isMobile || !collapsed) && (
            <>
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold">{item.label}</span>
                {item.description && (
                  <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">
                    {item.description}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
                <svg className={`h-4 w-4 ${isActive ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </>
          )}
        </motion.button>
      )
    })}
        </div>
      </div>
    ))

  return (
    <>
      {/* Desktop Sidebar — always visible on md+ */}
      <aside
        className={`
          hidden md:block
          bg-[#f3f4f0] dark:bg-slate-950
          border-r border-slate-200/80 dark:border-slate-800
          h-full
          ${collapsed ? 'w-20' : 'w-[320px]'}
          transition-all duration-300
          ${className}
        `}
      >
        <div className="flex h-full flex-col p-4">
          {brand && (
            <div className={`mb-5 rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 ${collapsed ? 'items-center justify-center' : ''}`}>
              {collapsed ? (
                <div className="mx-auto flex h-12 w-12 items-center justify-center">{brand.logo}</div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff8ef] dark:bg-emerald-950/40">
                    {brand.logo}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{brand.title}</h2>
                      {brand.badge && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {brand.badge}
                        </span>
                      )}
                    </div>
                    {brand.subtitle && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{brand.subtitle}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <nav className="flex-1 space-y-4 overflow-y-auto rounded-[28px] border border-white/70 bg-[#f8f8f5] p-3 dark:border-slate-800 dark:bg-slate-900/80">
          {renderNavItems(false)}
          </nav>
          {footer && !collapsed && (
            <div className="mt-4 rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff8ef] text-slate-900 dark:bg-emerald-950/40 dark:text-slate-100">
                  {footer.avatar || <span className="text-sm font-semibold">{footer.title.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{footer.title}</p>
                  {footer.subtitle && (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{footer.subtitle}</p>
                  )}
                </div>
                {footer.meta && <div className="text-xs text-slate-500 dark:text-slate-400">{footer.meta}</div>}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Drawer — slides in from left */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isMobileOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`
          md:hidden
          fixed inset-y-0 left-0 z-50
          bg-[#f3f4f0] dark:bg-slate-950
          border-r border-slate-200 dark:border-slate-800
          w-[300px] shadow-xl
          ${className}
        `}
      >
        {/* Mobile sidebar header with close button */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{brand?.title || 'Menu'}</span>
            {brand?.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{brand.subtitle}</p>}
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-800 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 pt-4">
          {brand?.logo && (
            <div className="mb-4 flex items-center gap-3 rounded-3xl border border-white/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff8ef] dark:bg-emerald-950/40">{brand.logo}</div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{brand.title}</p>
                {brand.badge && <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{brand.badge}</p>}
              </div>
            </div>
          )}
        </div>
        <nav className="p-4 space-y-4">
          {renderNavItems(true)}
        </nav>
      </motion.aside>
    </>
  )
}
