import React from 'react'

interface IconProps {
  className?: string
  size?: number
  strokeWidth?: number
}

export const Search: React.FC<IconProps> = ({ 
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
        cx="11" 
        cy="11" 
        r="8" 
      />
      <path 
        strokeWidth={strokeWidth} 
        d="m21 21-4.35-4.35" 
      />
    </svg>
  )
}

