import React from 'react'

interface IllustrationProps {
  className?: string
  width?: number
  height?: number
}

export const EmptyState: React.FC<IllustrationProps> = ({ 
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
      {/* Empty vault */}
      <rect x="120" y="80" width="160" height="160" rx="8" fill="url(#emptyGrad)" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.5"/>
      <circle cx="200" cy="160" r="20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
      
      {/* Plus icon */}
      <path d="M200 150v20m-10-10h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      
      {/* Floating elements */}
      <circle cx="100" cy="100" r="3" fill="currentColor" opacity="0.3">
        <animate attributeName="cy" values="100;90;100" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="300" cy="200" r="2" fill="currentColor" opacity="0.3">
        <animate attributeName="cy" values="200;190;200" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="320" cy="120" r="2.5" fill="currentColor" opacity="0.3">
        <animate attributeName="cy" values="120;110;120" dur="3.5s" repeatCount="indefinite"/>
      </circle>
      
      <defs>
        <linearGradient id="emptyGrad" x1="120" y1="80" x2="280" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea" stopOpacity="0.05"/>
          <stop offset="1" stopColor="#ec4899" stopOpacity="0.05"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

