import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getPasswordBreachCount } from '../crypto/crypto';

interface KeyRotationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

const KeyRotation: React.FC<KeyRotationProps> = ({ isOpen, onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    isValid: false
  });
  const [breachCount, setBreachCount] = useState<number | null>(null);
  const [checkingBreach, setCheckingBreach] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswords(false);
      setErrors({});
      setPasswordStrength({ score: 0, feedback: [], isValid: false });
    }
  }, [isOpen]);

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(calculatePasswordStrength(newPassword));
    } else {
      setPasswordStrength({ score: 0, feedback: [], isValid: false });
    }
  }, [newPassword]);

  // Debounced breach check
  useEffect(() => {
    if (!newPassword) {
      setBreachCount(null)
      return
    }
    const handle = setTimeout(async () => {
      try {
        setCheckingBreach(true)
        const count = await getPasswordBreachCount(newPassword)
        setBreachCount(count)
      } catch (e) {
        setBreachCount(null)
      } finally {
        setCheckingBreach(false)
      }
    }, 600)
    return () => clearTimeout(handle)
  }, [newPassword])

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');

    if (password.length >= 12) score += 1;
    else if (password.length > 8) feedback.push('Consider 12+ characters');

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    // Common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Avoid repeated characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 1;
      feedback.push('Avoid common sequences');
    }

    const isValid = score >= 4 && password.length >= 8;

    return {
      score: Math.max(0, Math.min(5, score)),
      feedback: feedback.length > 0 ? feedback : ['Strong password!'],
      isValid
    };
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (!passwordStrength.isValid) {
      newErrors.newPassword = 'Password is not strong enough';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsRotating(true);
    try {
      // Call key rotation API
      const response = await fetch('/api/vault/rotate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Key rotation failed');
      }

      const result = await response.json();
      
      // Show success message
      alert('Master key rotated successfully! You can now log in with your new password.');
      
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Key rotation failed:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Key rotation failed' });
    } finally {
      setIsRotating(false);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score < 2) return 'bg-red-500';
    if (score < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score < 2) return 'Weak';
    if (score < 4) return 'Medium';
    return 'Strong';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl w-full max-w-md mx-4 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Change Master Password</h2>
          <motion.button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            whileTap={{ scale: 0.96 }}
            disabled={isRotating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>

        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-800">Important</h3>
              <p className="text-sm text-amber-700 mt-1">
                This will re-encrypt your entire vault with a new master key. Make sure you remember your new password!
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current Master Password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition ${
                  errors.currentPassword ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="Enter current password"
                disabled={isRotating}
              />
            </div>
            {errors.currentPassword && (
              <p className="text-red-600 text-sm mt-1">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Master Password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition ${
                  errors.newPassword ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="Enter new password"
                disabled={isRotating}
              />
            </div>
            
            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Password Strength</span>
                  <span className={`text-sm font-medium ${
                    passwordStrength.score < 2 ? 'text-red-600' :
                    passwordStrength.score < 4 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {getStrengthText(passwordStrength.score)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <div className="mt-1">
                  {passwordStrength.feedback.map((feedback, index) => (
                    <p key={index} className={`text-xs ${
                      passwordStrength.isValid ? 'text-green-600' : 'text-slate-600'
                    }`}>
                      • {feedback}
                    </p>
                  ))}
                </div>
              </div>
            )}
          {/* Breach warning */}
          {breachCount !== null && breachCount > 0 && (
            <div className="mt-2 p-3 border border-amber-200 bg-amber-50 rounded-md text-sm text-amber-800">
              This password appears in known breaches {breachCount.toLocaleString()} times. Choose a unique, strong password.
            </div>
          )}
          {checkingBreach && (
            <div className="mt-2 text-xs text-slate-500">Checking breaches…</div>
          )}
            
            {errors.newPassword && (
              <p className="text-red-600 text-sm mt-1">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition ${
                  errors.confirmPassword ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="Confirm new password"
                disabled={isRotating}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Show/Hide Passwords Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showPasswords"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
              disabled={isRotating}
            />
            <label htmlFor="showPasswords" className="ml-2 block text-sm text-slate-700">
              Show passwords
            </label>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <motion.button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              whileTap={{ scale: 0.98 }}
              disabled={isRotating}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={isRotating || !passwordStrength.isValid || currentPassword === newPassword}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
              whileTap={{ scale: 0.98 }}
            >
              {isRotating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Rotating Key...
                </>
              ) : (
                'Rotate Master Key'
              )}
            </motion.button>
          </div>
        </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KeyRotation;
