import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { generateSecurePassword, type PasswordGeneratorOptions } from '../crypto/crypto';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (password: string) => void;
}

const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate
}) => {
  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 20,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false,
    customExclude: '',
    requireEachType: true
  });

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const password = await generateSecurePassword(options.length, options);
      setGeneratedPassword(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate password');
      console.error('Password generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  // Generate password when modal opens
  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen, handleGenerate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword);
  };

  const handleUse = () => {
    if (generatedPassword) {
      onGenerate(generatedPassword);
      onClose();
    }
  };

  const presetOptions = [
    { label: 'Strong (20 chars)', length: 20, includeSymbols: true },
    { label: 'Very Strong (32 chars)', length: 32, includeSymbols: true },
    { label: 'PIN (6 digits)', length: 6, includeUppercase: false, includeLowercase: false, includeSymbols: false, includeNumbers: true },
    { label: 'Passphrase (16 chars, no symbols)', length: 16, includeSymbols: false, excludeSimilar: true }
  ];

  const applyPreset = (preset: typeof presetOptions[0]) => {
    setOptions(prev => ({
      ...prev,
      length: preset.length,
      includeUppercase: preset.includeUppercase ?? prev.includeUppercase,
      includeLowercase: preset.includeLowercase ?? prev.includeLowercase,
      includeNumbers: preset.includeNumbers ?? prev.includeNumbers,
      includeSymbols: preset.includeSymbols ?? prev.includeSymbols,
      excludeSimilar: preset.excludeSimilar ?? prev.excludeSimilar
    }));
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
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-generator-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 id="password-generator-title" className="text-base font-semibold text-slate-900">Generate Password</h3>
                <motion.button 
                  onClick={onClose} 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors" 
                  whileTap={{ scale: 0.96 }} 
                  aria-label="Close dialog"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </motion.button>
              </div>

              {/* Content */}
              <div className="px-4 py-4 space-y-4">

                {/* Generated Password Display */}
                <div>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      readOnly
                      value={generatedPassword}
                      className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg bg-slate-50 font-mono text-sm"
                    />
                    <motion.button
                      onClick={handleCopy}
                      className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                      whileTap={{ scale: 0.96 }}
                    >
                      Copy
                    </motion.button>
                    <motion.button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                      whileTap={{ scale: 0.96 }}
                      title="Regenerate"
                    >
                      {isGenerating ? '...' : '↻'}
                    </motion.button>
                  </div>
                  {error && (
                    <p className="text-xs text-red-600 mb-2">{error}</p>
                  )}
                </div>

                {/* Presets */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Quick Presets</label>
                  <div className="flex flex-wrap gap-1.5">
                    {presetOptions.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-600">Length</label>
                    <span className="text-xs text-slate-500">{options.length}</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="64"
                    value={options.length}
                    onChange={(e) => setOptions(prev => ({ ...prev, length: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Character Types - Compact Grid */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Include</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={options.includeUppercase}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeUppercase: e.target.checked }))}
                        className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">A-Z</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={options.includeLowercase}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeLowercase: e.target.checked }))}
                        className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">a-z</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={options.includeNumbers}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeNumbers: e.target.checked }))}
                        className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">0-9</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={options.includeSymbols}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeSymbols: e.target.checked }))}
                        className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">!@#$</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <motion.button
                    onClick={onClose}
                    className="flex-1 px-3 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                  <motion.button
                    onClick={handleUse}
                    disabled={!generatedPassword || isGenerating}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    whileTap={{ scale: 0.98 }}
                  >
                    Use
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PasswordGeneratorModal;

