import React from 'react'

interface IllustrationProps {
  className?: string
  width?: number
  height?: number
}

export const SecureLogin: React.FC<IllustrationProps> = ({ 
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
      {/* Shield */}
      <path d="M200 60c-30 0-60 15-60 45v30c0 30 30 45 60 45s60-15 60-45v-30c0-30-30-45-60-45z" fill="url(#shieldGrad)" stroke="currentColor" strokeWidth="2"/>
      <path d="M200 120l-15 15 30 30 30-30z" fill="currentColor" opacity="0.8"/>
      
      {/* Lock */}
      <rect x="150" y="180" width="100" height="80" rx="4" fill="url(#lockGrad)" stroke="currentColor" strokeWidth="2"/>
      <rect x="170" y="200" width="60" height="50" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M200 200v-15c0-8 6-15 15-15s15 7 15 15v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Security lines */}
      <path d="M100 100h200M100 220h200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3"/>
      
      <defs>
        <linearGradient id="shieldGrad" x1="140" y1="60" x2="260" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea" stopOpacity="0.2"/>
          <stop offset="1" stopColor="#ec4899" stopOpacity="0.2"/>
        </linearGradient>
        <linearGradient id="lockGrad" x1="150" y1="180" x2="250" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea" stopOpacity="0.1"/>
          <stop offset="1" stopColor="#ec4899" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

