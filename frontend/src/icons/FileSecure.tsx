import React from 'react'

interface IconProps {
  className?: string
  size?: number
  strokeWidth?: number
}

export const FileSecure: React.FC<IconProps> = ({ 
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
      />
      <path 
        strokeWidth={strokeWidth} 
        d="M9 2v6h6" 
      />
      <circle 
        strokeWidth={strokeWidth} 
        cx="15" 
        cy="15" 
        r="2" 
      />
      <path 
        strokeWidth={strokeWidth} 
        d="M15 13v2m0 0v2" 
      />
    </svg>
  )
}

