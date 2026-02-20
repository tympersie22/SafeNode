/**
 * Loading Spinner Component
 * Beautiful, accessible loading indicators
 */

import React from 'react';
import clsx from 'clsx';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'white' | 'gray';
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

const colorClasses = {
  primary: 'border-gray-800 border-t-transparent',
  white: 'border-white border-t-transparent',
  gray: 'border-gray-300 border-t-transparent',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  color = 'primary',
}) => {
  return (
    <div
      className={clsx(
        'inline-block rounded-full animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// Full-screen loading overlay
export const LoadingOverlay: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
        <Spinner size="xl" />
        {message && (
          <p className="text-gray-700 font-medium text-lg">{message}</p>
        )}
      </div>
    </div>
  );
};

// Inline loading state
export const InlineLoader: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <Spinner size="md" />
      {message && <span className="text-gray-600 text-sm">{message}</span>}
    </div>
  );
};

export default Spinner;
