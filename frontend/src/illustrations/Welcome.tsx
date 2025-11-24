import React from 'react'

interface IllustrationProps {
  className?: string
  width?: number
  height?: number
}

export const Welcome: React.FC<IllustrationProps> = ({ 
  className = "w-full h-full", 
  width = 400,
  height = 300
}) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 400 300"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Vault door */}
      <rect x="120" y="80" width="160" height="180" rx="8" fill="url(#gradient1)" stroke="currentColor" strokeWidth="2"/>
      <circle cx="200" cy="170" r="25" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M200 155v15m0 0v15m0-15h-8m8 0h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Shield overlay */}
      <path d="M200 100c-20 0-40 10-40 30v20c0 20 20 30 40 30s40-10 40-30v-20c0-20-20-30-40-30z" fill="url(#gradient2)" opacity="0.3"/>
      
      {/* Sparkles */}
      <circle cx="100" cy="60" r="3" fill="currentColor" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="300" cy="70" r="2" fill="currentColor" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="80" cy="200" r="2.5" fill="currentColor" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      
      <defs>
        <linearGradient id="gradient1" x1="120" y1="80" x2="280" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea" stopOpacity="0.1"/>
          <stop offset="1" stopColor="#ec4899" stopOpacity="0.1"/>
        </linearGradient>
        <linearGradient id="gradient2" x1="160" y1="100" x2="240" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea"/>
          <stop offset="1" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

