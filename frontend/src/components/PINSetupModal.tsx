/**
 * PIN Setup Modal
 * Allows users to set up or change their PIN for multi-factor unlock
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { pinManager } from '../utils/pinManager';
import Button from '../ui/Button';

interface PINSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterPassword: string;
  salt: ArrayBuffer;
  onSuccess?: () => void;
}

const PINSetupModal: React.FC<PINSetupModalProps> = ({
  isOpen,
  onClose,
  masterPassword,
  salt,
  onSuccess
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      pinManager.init().then(() => {
        setPinEnabled(pinManager.isEnabled());
      });
    }
  }, [isOpen]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pinManager.validatePINFormat(pin)) {
      setError(`PIN must be ${pinManager.getConfig().minLength}-${pinManager.getConfig().maxLength} digits`);
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setIsLoading(true);
    try {
      if (isChanging) {
        await pinManager.changePIN(oldPin, pin, masterPassword, salt);
      } else {
        await pinManager.setupPIN(pin, masterPassword, salt);
      }
      setPin('');
      setConfirmPin('');
      setOldPin('');
      setIsChanging(false);
      setPinEnabled(true);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to set up PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable PIN unlock?')) return;

    setIsLoading(true);
    setError(null);
    try {
      await pinManager.disablePIN(masterPassword, salt);
      setPinEnabled(false);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to disable PIN');
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
          <h2 className="text-xl font-semibold text-slate-900">
            {pinEnabled ? (isChanging ? 'Change PIN' : 'PIN Settings') : 'Set Up PIN'}
          </h2>
          <Button onClick={onClose} variant="ghost" size="sm">
            ✕
          </Button>
        </div>

        {pinEnabled && !isChanging ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              PIN unlock is enabled. You can change your PIN or disable it.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsChanging(true)}
                variant="primary"
                className="flex-1"
              >
                Change PIN
              </Button>
              <Button
                onClick={handleDisable}
                variant="danger"
                className="flex-1"
                disabled={isLoading}
              >
                Disable PIN
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSetup} className="space-y-4">
            {isChanging && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Current PIN
                </label>
                <input
                  type="password"
                  value={oldPin}
                  onChange={(e) => {
                    setOldPin(e.target.value.replace(/\D/g, ''));
                    setError(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Enter current PIN"
                  maxLength={pinManager.getConfig().maxLength}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isChanging ? 'New PIN' : 'PIN'}
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError(null);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder={`${pinManager.getConfig().minLength}-${pinManager.getConfig().maxLength} digits`}
                maxLength={pinManager.getConfig().maxLength}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                PIN must be {pinManager.getConfig().minLength}-{pinManager.getConfig().maxLength} digits
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm PIN
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, ''));
                  setError(null);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Confirm PIN"
                maxLength={pinManager.getConfig().maxLength}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setIsChanging(false);
                  setPin('');
                  setConfirmPin('');
                  setOldPin('');
                  setError(null);
                  onClose();
                }}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={isLoading || !pin || !confirmPin || (isChanging && !oldPin)}
              >
                {isLoading ? 'Saving...' : isChanging ? 'Change PIN' : 'Set Up PIN'}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default PINSetupModal;

