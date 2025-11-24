import React from 'react'

interface IconProps {
  className?: string
  size?: number
  strokeWidth?: number
}

export const Keyhole: React.FC<IconProps> = ({ 
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
      <circle 
        strokeWidth={strokeWidth} 
        cx="12" 
        cy="10" 
        r="3" 
      />
      <path 
        strokeWidth={strokeWidth} 
        d="M12 13v4m0 0v2m0-2h-2m2 0h2" 
      />
      <rect 
        strokeWidth={strokeWidth} 
        x="4" 
        y="4" 
        width="16" 
        height="16" 
        rx="2" 
      />
    </svg>
  )
}

