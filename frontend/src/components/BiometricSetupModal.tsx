/**
 * Biometric Setup Modal
 * Allows users to register biometric credentials for authentication
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { biometricAuthService, type BiometricCapabilities } from '../utils/biometricAuth';
import Button from '../ui/Button';

interface BiometricSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onSuccess?: () => void;
}

const BiometricSetupModal: React.FC<BiometricSetupModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  onSuccess
}) => {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isOpen) {
      checkAvailability();
    }
  }, [isOpen]);

  const checkAvailability = async () => {
    setIsChecking(true);
    setError(null);
    try {
      const caps = await biometricAuthService.isAvailable();
      setCapabilities(caps);
    } catch (error: any) {
      setError(error.message || 'Failed to check biometric availability');
    } finally {
      setIsChecking(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await biometricAuthService.register(
        userId,
        userName,
        userName
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to register biometric');
      }

      // Store master password in keychain for biometric unlock
      // In a real app, this would be done after successful password unlock
      localStorage.setItem('safenode_biometric_enabled', 'true');
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to register biometric');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Set Up Biometric Authentication</h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            ✕
          </Button>
        </div>

        {isChecking ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-secondary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : capabilities?.available ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
                {capabilities.type === 'face' ? (
                  <span className="text-3xl">👤</span>
                ) : (
                  <span className="text-3xl">👆</span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {biometricAuthService.getPlatformName()}
              </h3>
              <p className="text-sm text-slate-600">
                {capabilities.type === 'face'
                  ? 'Use your face to unlock SafeNode quickly and securely.'
                  : 'Use your fingerprint to unlock SafeNode quickly and securely.'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRegister}
                variant="primary"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Setting up...' : 'Set Up Biometric'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Biometric Authentication Not Available
              </h3>
              <p className="text-sm text-slate-600">
                {capabilities?.platform === 'web'
                  ? 'Your browser or device does not support biometric authentication. Try using Windows Hello, Touch ID on macOS Safari, or a device with biometric sensors.'
                  : 'Biometric authentication is not available on this platform. Please use password or PIN unlock.'}
              </p>
            </div>

            <Button
              type="button"
              onClick={onClose}
              variant="primary"
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default BiometricSetupModal;

