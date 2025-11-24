import React from 'react'

interface IconProps {
  className?: string
  size?: number
  strokeWidth?: number
}

export const EditEntry: React.FC<IconProps> = ({ 
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
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
      />
    </svg>
  )
}

