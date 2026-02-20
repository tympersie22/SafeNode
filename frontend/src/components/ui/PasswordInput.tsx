/**
 * Password Input with Visibility Toggle
 * Secure, accessible password input with show/hide functionality
 */

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  showStrength?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      error,
      hint,
      className,
      showStrength = false,
      onVisibilityChange,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
      const newState = !isVisible;
      setIsVisible(newState);
      onVisibilityChange?.(newState);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            type={isVisible ? 'text' : 'password'}
            className={clsx(
              'w-full px-4 py-3 pr-12 rounded-xl border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent',
              error
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 bg-white hover:border-gray-400',
              'text-gray-900 placeholder-gray-400',
              className
            )}
            autoComplete="off"
            {...props}
          />

          <button
            type="button"
            onClick={toggleVisibility}
            className={clsx(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'p-2 rounded-lg transition-colors',
              'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-gray-900'
            )}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {isVisible ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {hint && !error && (
          <p className="mt-2 text-sm text-gray-500">{hint}</p>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
