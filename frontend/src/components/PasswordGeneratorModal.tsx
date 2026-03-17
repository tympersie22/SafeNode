import React, { useState, useEffect } from 'react';
import { Copy, RefreshCcw, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { generateSecurePassword, type PasswordGeneratorOptions } from '../crypto/crypto';
import { SaasButton, SaasCard, SaasInput, SaasModal } from '../ui';

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
    <SaasModal isOpen={isOpen} onClose={onClose} title="Password Generator" size="lg">
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <SaasCard padding="md" className="border border-slate-200 bg-[linear-gradient(135deg,rgba(247,250,245,1)_0%,rgba(255,255,255,1)_100%)] dark:border-slate-700 dark:bg-[linear-gradient(135deg,rgba(15,23,42,1)_0%,rgba(30,41,59,1)_100%)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Generated output
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  Use presets for common cases or tune the character rules below.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white shadow-lg dark:bg-white dark:text-slate-950">
                <Wand2 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Candidate password</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Generated locally on your device.
                  </p>
                </div>
                <div className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {options.length} chars
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-base tracking-[0.08em] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:text-lg">
                {generatedPassword || 'Generating password…'}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <SaasButton type="button" variant="secondary" size="sm" onClick={handleCopy} icon={<Copy className="h-4 w-4" />}>
                  Copy
                </SaasButton>
                <SaasButton type="button" variant="outline" size="sm" onClick={handleGenerate} loading={isGenerating} icon={<RefreshCcw className="h-4 w-4" />}>
                  Regenerate
                </SaasButton>
              </div>

              {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
            </div>
          </SaasCard>

          <SaasCard padding="md" className="border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quick presets</p>
            <div className="mt-4 grid gap-2">
              {presetOptions.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-300 hover:bg-[#f7fbf6] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-900 dark:hover:bg-slate-950"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{preset.label}</span>
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </SaasCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <SaasCard padding="md" className="border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Length</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{options.length} characters</h3>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                4-128 range
              </div>
            </div>
            <input
              type="range"
              min="4"
              max="128"
              value={options.length}
              onChange={(e) => setOptions(prev => ({ ...prev, length: parseInt(e.target.value) }))}
              className="mt-4 w-full accent-emerald-600"
            />
          </SaasCard>

          <SaasCard padding="md" className="border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Custom exclusions</p>
            <div className="mt-4">
              <SaasInput
                value={options.customExclude || ''}
                onChange={(e) => setOptions(prev => ({ ...prev, customExclude: e.target.value }))}
                placeholder="e.g. abc123"
                helperText="Characters entered here will never appear in the generated password."
              />
            </div>
          </SaasCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <SaasCard padding="md" className="border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Character types</p>
            <div className="mt-4 space-y-2">
              {[
                { key: 'includeUppercase', label: 'Uppercase (A-Z)' },
                { key: 'includeLowercase', label: 'Lowercase (a-z)' },
                { key: 'includeNumbers', label: 'Numbers (0-9)' },
                { key: 'includeSymbols', label: 'Symbols (!@#$%...)' }
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(options[item.key as keyof PasswordGeneratorOptions])}
                    onChange={(e) => setOptions(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              ))}
            </div>
          </SaasCard>

          <SaasCard padding="md" className="border border-slate-200 dark:border-slate-700">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Safety rules</p>
            <div className="mt-4 space-y-2">
              {[
                { key: 'excludeSimilar', label: 'Exclude similar characters' },
                { key: 'excludeAmbiguous', label: 'Exclude ambiguous symbols' },
                { key: 'requireEachType', label: 'Require one of each selected type' }
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(options[item.key as keyof PasswordGeneratorOptions])}
                    onChange={(e) => setOptions(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              ))}
            </div>
          </SaasCard>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SaasButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </SaasButton>
          <SaasButton
            type="button"
            variant="primary"
            onClick={handleUse}
            disabled={!generatedPassword || isGenerating}
            icon={<Sparkles className="h-4 w-4" />}
          >
            Use password
          </SaasButton>
        </div>
      </div>
    </SaasModal>
  );
};

export default PasswordGeneratorModal;
