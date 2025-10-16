import type { VaultEntry } from '../types/vault';

export interface HealthIssue {
  type: 'weak' | 'reused' | 'compromised';
  entryId: string;
  entryName: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface PasswordHealthSummary {
  score: number;
  totalEntries: number;
  strongCount: number;
  weakCount: number;
  reusedCount: number;
  compromisedCount: number;
  issues: HealthIssue[];
}

const hasMixedCase = (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value);
const hasNumbers = (value: string) => /\d/.test(value);
const hasSymbols = (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value);

const isStrongPassword = (password: string): boolean => {
  if (password.length >= 16) return hasMixedCase(password) && hasNumbers(password);
  if (password.length >= 12) return hasMixedCase(password) && hasNumbers(password) && hasSymbols(password);
  return false;
};

export function evaluatePasswordHealth(entries: VaultEntry[]): PasswordHealthSummary {
  const total = entries.length;
  if (total === 0) {
    return {
      score: 100,
      totalEntries: 0,
      strongCount: 0,
      weakCount: 0,
      reusedCount: 0,
      compromisedCount: 0,
      issues: []
    };
  }

  let strongCount = 0;
  let weakCount = 0;
  const issues: HealthIssue[] = [];

  const passwordUsage = new Map<string, VaultEntry[]>();

  entries.forEach(entry => {
    const pwd = entry.password || '';
    if (pwd) {
      const list = passwordUsage.get(pwd) ?? [];
      list.push(entry);
      passwordUsage.set(pwd, list);
    }

    if (pwd && isStrongPassword(pwd)) {
      strongCount += 1;
    } else {
      weakCount += 1;
      issues.push({
        type: 'weak',
        entryId: entry.id,
        entryName: entry.name,
        severity: 'medium',
        message: 'Password can be stronger. Use 12+ characters with mixed case, numbers, and symbols.'
      });
    }

    if (entry.breachCount && entry.breachCount > 0) {
      issues.push({
        type: 'compromised',
        entryId: entry.id,
        entryName: entry.name,
        severity: entry.breachCount > 100 ? 'high' : 'medium',
        message: `Found in ${entry.breachCount.toLocaleString()} known breach${entry.breachCount > 1 ? 'es' : ''}.`
      });
    }
  });

  let reusedCount = 0;
  passwordUsage.forEach(entriesUsingPassword => {
    if (entriesUsingPassword.length > 1) {
      reusedCount += entriesUsingPassword.length;
      entriesUsingPassword.forEach(entry => {
        issues.push({
          type: 'reused',
          entryId: entry.id,
          entryName: entry.name,
          severity: 'high',
          message: `Password reused across ${entriesUsingPassword.length} entries.`
        });
      });
    }
  });

  const compromisedCount = issues.filter(issue => issue.type === 'compromised').length;

  // Score heuristic: start at 100, subtract penalties
  let score = 100;
  score -= weakCount * 5;
  score -= reusedCount * 3;
  score -= compromisedCount * 10;
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // Sort issues by severity (high first), then type
  const severityOrder: Record<HealthIssue['severity'], number> = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => {
    const severityDelta = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDelta !== 0) return severityDelta;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.entryName.localeCompare(b.entryName);
  });

  return {
    score,
    totalEntries: total,
    strongCount,
    weakCount,
    reusedCount,
    compromisedCount,
    issues
  };
}

