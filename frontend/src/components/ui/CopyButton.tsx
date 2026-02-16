/**
 * Copy to Clipboard Button
 * One-click copy with visual feedback
 */

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import showToast from './Toast';

export interface CopyButtonProps {
  value: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  onCopy?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
};

const iconSizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  label = 'Copy',
  size = 'md',
  variant = 'icon',
  onCopy,
  className,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      showToast.copied(label === 'Copy' ? 'Copied to clipboard' : `${label} copied`);
      onCopy?.();

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      showToast.error('Failed to copy');
      console.error('Copy failed:', error);
    }
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={clsx(
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
          'bg-white border border-gray-300 hover:border-gray-400',
          'text-gray-700 hover:text-gray-900',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500',
          isCopied && 'bg-green-50 border-green-300 text-green-700',
          className
        )}
        disabled={isCopied}
      >
        {isCopied ? (
          <>
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span className="text-sm font-medium">{label}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg',
        'transition-all duration-200',
        'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500',
        isCopied && 'text-green-600 bg-green-50',
        sizeClasses[size],
        className
      )}
      aria-label={label}
      title={label}
      disabled={isCopied}
    >
      {isCopied ? (
        <Check className={iconSizeClasses[size]} />
      ) : (
        <Copy className={iconSizeClasses[size]} />
      )}
    </button>
  );
};

export default CopyButton;
