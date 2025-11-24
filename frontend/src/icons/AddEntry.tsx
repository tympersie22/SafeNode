import React from 'react'

interface IconProps {
  className?: string
  size?: number
  strokeWidth?: number
}

export const AddEntry: React.FC<IconProps> = ({ 
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
      <path 
        strokeWidth={strokeWidth} 
        d="M12 4v16m8-8H4" 
      />
      <rect 
        strokeWidth={strokeWidth} 
        x="3" 
        y="3" 
        width="18" 
        height="18" 
        rx="2" 
      />
    </svg>
  )
}

