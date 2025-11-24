import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

export interface SaasTooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export const SaasTooltip: React.FC<SaasTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const updatePosition = () => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const tooltipOffset = 8

    switch (position) {
      case 'top':
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - tooltipOffset,
        })
        break
      case 'bottom':
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + tooltipOffset,
        })
        break
      case 'left':
        setTooltipPosition({
          x: rect.left - tooltipOffset,
          y: rect.top + rect.height / 2,
        })
        break
      case 'right':
        setTooltipPosition({
          x: rect.right + tooltipOffset,
          y: rect.top + rect.height / 2,
        })
        break
    }
  }

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      updatePosition()
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isVisible])

  if (typeof window === 'undefined') return <>{children}</>

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              className={`fixed z-50 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-safenode-lg pointer-events-none ${positionClasses[position]} ${className}`}
              style={{
                left: position === 'left' || position === 'right' ? tooltipPosition.x : undefined,
                top: position === 'top' || position === 'bottom' ? tooltipPosition.y : undefined,
                transform: position === 'left' || position === 'right' 
                  ? `translateY(-50%)` 
                  : `translateX(-50%)`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {content}
              {/* Arrow */}
              <div
                className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45 ${
                  position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
                  position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
                  position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
                  'right-full top-1/2 -translate-y-1/2 -mr-1'
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

