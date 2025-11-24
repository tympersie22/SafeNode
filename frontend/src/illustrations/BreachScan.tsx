import React from 'react'

interface IllustrationProps {
  className?: string
  width?: number
  height?: number
}

export const BreachScan: React.FC<IllustrationProps> = ({ 
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
      {/* Scanning shield */}
      <path d="M200 80c-40 0-80 20-80 60v40c0 40 40 60 80 60s80-20 80-60v-40c0-40-40-60-80-60z" fill="url(#scanGrad)" stroke="currentColor" strokeWidth="2"/>
      
      {/* Scanning lines */}
      <g opacity="0.6">
        <line x1="120" y1="140" x2="280" y2="140" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4">
          <animate attributeName="y1" values="140;200;140" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="140;200;140" dur="2s" repeatCount="indefinite"/>
        </line>
      </g>
      
      {/* Warning icon */}
      <path d="M200 120l-20 40h40z" fill="currentColor" opacity="0.8"/>
      <circle cx="200" cy="135" r="3" fill="url(#warningGrad)"/>
      <line x1="200" y1="145" x2="200" y2="155" stroke="url(#warningGrad)" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Radar circles */}
      <circle cx="200" cy="200" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
        <animate attributeName="r" values="30;50;30" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
      </circle>
      
      <defs>
        <linearGradient id="scanGrad" x1="120" y1="80" x2="280" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea" stopOpacity="0.2"/>
          <stop offset="1" stopColor="#ec4899" stopOpacity="0.2"/>
        </linearGradient>
        <linearGradient id="warningGrad" x1="200" y1="120" x2="200" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b"/>
          <stop offset="1" stopColor="#ef4444"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

