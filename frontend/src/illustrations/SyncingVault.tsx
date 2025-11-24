import React from 'react'

interface IllustrationProps {
  className?: string
  width?: number
  height?: number
}

export const SyncingVault: React.FC<IllustrationProps> = ({ 
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
      {/* Cloud */}
      <path d="M200 100c-20 0-40 15-40 35 0 5 5 5 10 5h60c5 0 10 0 10-5 0-20-20-35-40-35z" fill="url(#cloudGrad)" stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="180" cy="120" rx="25" ry="20" fill="url(#cloudGrad)"/>
      <ellipse cx="220" cy="120" rx="25" ry="20" fill="url(#cloudGrad)"/>
      
      {/* Vault */}
      <rect x="150" y="180" width="100" height="80" rx="4" fill="url(#vaultGrad)" stroke="currentColor" strokeWidth="2"/>
      <circle cx="200" cy="220" r="15" fill="none" stroke="currentColor" strokeWidth="2"/>
      
      {/* Sync arrows */}
      <path d="M120 200l20-20m0 0l-10 10m10-10v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite"/>
      </path>
      <path d="M280 200l-20-20m0 0l10 10m-10-10v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.75s"/>
      </path>
      
      {/* Sync dots */}
      <circle cx="200" cy="160" r="3" fill="currentColor" opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite"/>
      </circle>
      
      <defs>
        <linearGradient id="cloudGrad" x1="160" y1="100" x2="240" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea" stopOpacity="0.2"/>
          <stop offset="1" stopColor="#ec4899" stopOpacity="0.2"/>
        </linearGradient>
        <linearGradient id="vaultGrad" x1="150" y1="180" x2="250" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9333ea" stopOpacity="0.15"/>
          <stop offset="1" stopColor="#ec4899" stopOpacity="0.15"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

