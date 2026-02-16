/**
 * Toast Notification System
 * Professional, accessible toast notifications with auto-dismiss
 */

import React from 'react';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#ffffff',
          color: '#1f2937',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          maxWidth: '500px',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div className="flex items-start gap-3 w-full">
              <div className="flex-shrink-0 mt-0.5">{icon}</div>
              <div className="flex-1 text-sm font-medium">{message}</div>
              {t.type !== 'loading' && (
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
};

// Enhanced toast utilities
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    });
  },

  error: (message: string) => {
    toast.error(message, {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
    });
  },

  info: (message: string) => {
    toast(message, {
      icon: <Info className="w-5 h-5 text-blue-500" />,
    });
  },

  warning: (message: string) => {
    toast(message, {
      icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    });
  },

  // Copy to clipboard with feedback
  copied: (label: string = 'Copied to clipboard') => {
    toast.success(label, {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      duration: 2000,
    });
  },
};

export default showToast;
