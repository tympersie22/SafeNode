import React from 'react'

interface IconProps {
  className?: string
  size?: number
  strokeWidth?: number
}

export const PasswordDots: React.FC<IconProps> = ({ 
  className = "w-5 h-5", 
  size = 24,
  strokeWidth = 2 
}) => {
  return (
    <svg 
      className={className} 
      fill="currentColor" 
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  )
}

