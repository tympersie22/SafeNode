import React from 'react'

interface IconProps {
  className?: string
  size?: number
  strokeWidth?: number
}

export const FolderSecure: React.FC<IconProps> = ({ 
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
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" 
      />
      <path 
        strokeWidth={strokeWidth} 
        d="M12 11v2m0 0v2m0-2h-1m1 0h1" 
      />
      <circle 
        strokeWidth={strokeWidth} 
        cx="12" 
        cy="13" 
        r="1.5" 
      />
    </svg>
  )
}

