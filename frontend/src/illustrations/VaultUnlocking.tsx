import React from 'react'

interface IllustrationProps {
  className?: string
  width?: number
  height?: number
}

export const VaultUnlocking: React.FC<IllustrationProps> = ({ 
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
      {/* Vault door opening */}
      <rect x="100" y="60" width="200" height="200" rx="8" fill="url(#doorGrad)" stroke="currentColor" strokeWidth="2"/>
      <path d="M100 60l200 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      
      {/* Keyhole with key */}
      <circle cx="200" cy="160" r="30" fill="none" stroke="currentColor" strokeWidth="2"/>
      <rect x="195" y="160" width="10" height="40" rx="2" fill="currentColor" opacity="0.3"/>
      
      {/* Key */}
      <g transform="translate(200, 160)">
        <circle r="8" fill="url(#keyGrad)"/>
        <rect x="8" y="-3" width="30" height="6" rx="3" fill="url(#keyGrad)"/>
        <rect x="30" y="-8" width="4" height="16" rx="2" fill="url(#keyGrad)"/>
      </g>
      
      {/* Opening rays */}
      <path d="M100 60l-20-20M300 60l20-20M100 260l-20 20M300 260l20 20" stroke="currentColor" strokeWidth="2" opacity="0.4" strokeLinecap="round">
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite"/>
      </path>
      
      <defs>
        <linearGradient id="doorGrad" x1="100" y1="60" x2="300" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea" stopOpacity="0.15"/>
          <stop offset="1" stopColor="#ec4899" stopOpacity="0.15"/>
        </linearGradient>
        <linearGradient id="keyGrad" x1="0" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea"/>
          <stop offset="1" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

