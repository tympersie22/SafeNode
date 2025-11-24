import React from 'react'

interface IconProps {
  className?: string
  size?: number
  strokeWidth?: number
}

export const VaultDoor: React.FC<IconProps> = ({ 
  className = "w-5 h-5", 
  size = 24,
  strokeWidth = 2 
}) => {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      width={size}
      height={size}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect 
        strokeWidth={strokeWidth} 
        x="3" 
        y="4" 
        width="18" 
        height="16" 
        rx="2" 
      />
      <circle 
        strokeWidth={strokeWidth} 
        cx="12" 
        cy="12" 
        r="3" 
      />
      <path 
        strokeWidth={strokeWidth} 
        d="M12 9v3m0 0v3m0-3h3m-3 0H9" 
      />
      <path 
        strokeWidth={strokeWidth} 
        d="M3 8h18M3 16h18" 
      />
    </svg>
  )
}

