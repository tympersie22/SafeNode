import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

/**
 * Calculate password entropy (bits of entropy)
 */
function calculateEntropy(password: string): number {
  if (!password) return 0;

  // Character set analysis
  let charsetSize = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasNumbers) charsetSize += 10;
  if (hasSymbols) charsetSize += 32; // Common symbols

  if (charsetSize === 0) return 0;

  // Entropy = log2(charsetSize^length)
  const entropy = password.length * Math.log2(charsetSize);
  return entropy;
}

/**
 * Get strength level from entropy
 */
function getStrengthLevel(entropy: number): {
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  score: number; // 0-100
  label: string;
  color: string;
} {
  if (entropy < 28) {
    return { level: 'weak', score: Math.min(25, (entropy / 28) * 25), label: 'Weak', color: '#ef4444' }; // red
  } else if (entropy < 36) {
    return { level: 'fair', score: 25 + ((entropy - 28) / 8) * 25, label: 'Fair', color: '#f59e0b' }; // amber
  } else if (entropy < 60) {
    return { level: 'good', score: 50 + ((entropy - 36) / 24) * 25, label: 'Good', color: '#3b82f6' }; // blue
  } else if (entropy < 80) {
    return { level: 'strong', score: 75 + ((entropy - 60) / 20) * 20, label: 'Strong', color: '#10b981' }; // green
  } else {
    return { level: 'very-strong', score: 100, label: 'Very Strong', color: '#059669' }; // emerald
  }
}

/**
 * Get password feedback
 */
function getPasswordFeedback(password: string): string[] {
  const feedback: string[] = [];
  
  if (password.length < 8) {
    feedback.push('Use at least 8 characters');
  } else if (password.length < 12) {
    feedback.push('Consider using 12+ characters for better security');
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Add lowercase letters');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters');
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Add numbers');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('Add symbols');
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeating characters');
  }
  if (/123|abc|qwe/i.test(password)) {
    feedback.push('Avoid common sequences');
  }

  return feedback;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password, className = '' }) => {
  const entropy = useMemo(() => calculateEntropy(password), [password]);
  const strength = useMemo(() => getStrengthLevel(entropy), [entropy]);
  const feedback = useMemo(() => getPasswordFeedback(password), [password]);

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength Bar */}
      <div className="relative">
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strength.score}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: strength.color }}
          />
        </div>
        {/* Strength segments */}
        <div className="absolute inset-0 flex">
          {[0, 25, 50, 75, 100].map((percent) => (
            <div
              key={percent}
              className="flex-1 border-r border-slate-300 dark:border-slate-600 last:border-r-0"
            />
          ))}
        </div>
      </div>

      {/* Strength Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Strength: <span style={{ color: strength.color }}>{strength.label}</span>
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({entropy.toFixed(1)} bits)
          </span>
        </div>
        <motion.div
          key={strength.score}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-xs font-mono text-slate-500 dark:text-slate-400"
        >
          {Math.round(strength.score)}%
        </motion.div>
      </div>

      {/* Feedback */}
      {feedback.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-xs text-slate-600 dark:text-slate-400 space-y-1"
        >
          {feedback.slice(0, 3).map((tip, index) => (
            <motion.div
              key={tip}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2"
            >
              <span className="text-slate-400">•</span>
              <span>{tip}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Entropy visualization */}
      {entropy > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Password entropy</span>
            <div className="flex items-center gap-1">
              {[0, 20, 40, 60, 80, 100].map((threshold) => (
                <div
                  key={threshold}
                  className={`w-1.5 h-1.5 rounded-full ${
                    entropy >= threshold
                      ? 'bg-green-500'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;

