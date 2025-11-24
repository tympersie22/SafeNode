import React from 'react'

interface IllustrationProps {
  className?: string
  width?: number
  height?: number
}

export const SuccessConfirmation: React.FC<IllustrationProps> = ({ 
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
      {/* Success circle */}
      <circle cx="200" cy="150" r="60" fill="url(#successGrad)" stroke="currentColor" strokeWidth="2"/>
      
      {/* Checkmark */}
      <path d="M175 150l15 15 30-30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      
      {/* Success rays */}
      <g opacity="0.4">
        <line x1="200" y1="80" x2="200" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/>
        </line>
        <line x1="200" y1="220" x2="200" y2="240" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" begin="0.5s"/>
        </line>
        <line x1="140" y1="150" x2="120" y2="150" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" begin="1s"/>
        </line>
        <line x1="260" y1="150" x2="280" y2="150" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" begin="1.5s"/>
        </line>
      </g>
      
      {/* Sparkles */}
      <circle cx="120" cy="100" r="2" fill="currentColor" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="280" cy="200" r="2.5" fill="currentColor" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
      </circle>
      
      <defs>
        <linearGradient id="successGrad" x1="140" y1="90" x2="260" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c55e" stopOpacity="0.2"/>
          <stop offset="1" stopColor="#16a34a" stopOpacity="0.2"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

