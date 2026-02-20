import React, { useState, useEffect } from 'react';
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

  // Generate password on mount and when options change
  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const password = await generateSecurePassword(options.length, options);
      setGeneratedPassword(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate password');
    } finally {
      setIsGenerating(false);
    }
  };

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
              <div className="card-body">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Password Generator</h2>
                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 text-2xl leading-none touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>

                {/* Generated Password Display */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Generated Password
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedPassword}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-white font-mono text-base sm:text-lg min-h-[44px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors min-h-[44px]"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
                      >
                        {isGenerating ? '...' : '↻'}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}
                </div>

                {/* Presets */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quick Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {presetOptions.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors min-h-[44px] whitespace-nowrap"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Length: {options.length}
                    </label>
                    <span className="text-sm text-slate-500">{options.length} characters</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="128"
                    value={options.length}
                    onChange={(e) => setOptions(prev => ({ ...prev, length: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Character Types */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Character Types
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeUppercase}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeUppercase: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Uppercase (A-Z)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeLowercase}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeLowercase: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Lowercase (a-z)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeNumbers}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeNumbers: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Numbers (0-9)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.includeSymbols}
                        onChange={(e) => setOptions(prev => ({ ...prev, includeSymbols: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Symbols (!@#$%...)</span>
                    </label>
                  </div>
                </div>

                {/* Exclusion Options */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Exclusion Rules
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.excludeSimilar}
                        onChange={(e) => setOptions(prev => ({ ...prev, excludeSimilar: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Exclude similar characters (i, l, 1, L, o, 0, O)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.excludeAmbiguous}
                        onChange={(e) => setOptions(prev => ({ ...prev, excludeAmbiguous: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Exclude ambiguous symbols (&#123; &#125; [ ] ( ) / \ &apos; &quot; ` ~ , ; : . &lt; &gt;)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.requireEachType}
                        onChange={(e) => setOptions(prev => ({ ...prev, requireEachType: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Require at least one of each selected type</span>
                    </label>
                  </div>
                </div>

                {/* Custom Exclude */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Custom Exclusions (optional)
                  </label>
                  <input
                    type="text"
                    value={options.customExclude || ''}
                    onChange={(e) => setOptions(prev => ({ ...prev, customExclude: e.target.value }))}
                    placeholder="e.g., abc123"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Enter characters to exclude from the password
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUse}
                    disabled={!generatedPassword || isGenerating}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    Use Password
                  </button>
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

