import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { HealthIssue, PasswordHealthSummary } from '../health/passwordHealth';

export const watchtowerIssueKey = (issue: HealthIssue) => `${issue.entryId}:${issue.type}`;

interface WatchtowerBannerProps {
  issues: HealthIssue[];
  onReview: () => void;
  onDismiss: (issueId: string) => void;
}

export const WatchtowerBanner: React.FC<WatchtowerBannerProps> = ({ issues, onReview, onDismiss }) => {
  if (issues.length === 0) return null;
  const primary = issues[0];
  const key = watchtowerIssueKey(primary);
  const extra = issues.length - 1;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border border-amber-200 rounded-lg bg-amber-50">
      <div>
        <p className="text-sm font-medium text-amber-800">
          Watchtower alert: <span className="font-semibold">{primary.entryName}</span> – {primary.message}
        </p>
        {extra > 0 && (
          <p className="text-xs text-amber-700 mt-1">
            +{extra} other high-priority {extra === 1 ? 'issue' : 'issues'} need attention.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onReview}
          className="btn btn-sm btn-primary"
        >
          Review in Watchtower
        </button>
        <button
          onClick={() => onDismiss(key)}
          className="btn btn-sm btn-outline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

interface WatchtowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: PasswordHealthSummary | null;
  dismissed: string[];
  onDismiss: (issueId: string) => void;
  onRescan: () => void;
  scanning: boolean;
  lastScanAt: number | null;
}

const severityLabel: Record<HealthIssue['severity'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

const severityBadge: Record<HealthIssue['severity'], string> = {
  high: 'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  low: 'bg-slate-100 text-slate-600 border border-slate-200'
};

const formatRelative = (timestamp: number | null) => {
  if (!timestamp) return 'never';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const WatchtowerModal: React.FC<WatchtowerModalProps> = ({
  isOpen,
  onClose,
  summary,
  dismissed,
  onDismiss,
  onRescan,
  scanning,
  lastScanAt
}) => {
  const issues = summary?.issues ?? [];
  const activeIssues = issues.filter(issue => !dismissed.includes(watchtowerIssueKey(issue)));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="watchtower-title"
          >
            <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                  <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Back" title="Back">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <h3 id="watchtower-title" className="text-lg font-semibold text-slate-900">Watchtower</h3>
                        <p className="text-xs text-slate-500">Security monitoring & breach detection</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Close dialog">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              {summary && (
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">{summary.totalEntries}</div>
                      <div className="text-xs text-slate-600">Total Entries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{summary.weakCount}</div>
                      <div className="text-xs text-slate-600">Weak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">{summary.reusedCount}</div>
                      <div className="text-xs text-slate-600">Reused</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{summary.compromisedCount}</div>
                      <div className="text-xs text-slate-600">Breached</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-600">
                      Active security issues detected in your vault.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Last scan: {formatRelative(lastScanAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onRescan}
                      className="btn btn-sm btn-primary"
                      disabled={scanning}
                    >
                      {scanning ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 014 12z" />
                          </svg>
                          <span>Scanning…</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span>Scan Now</span>
                        </>
                      )}
                    </button>
                    {activeIssues.length > 0 && (
                    <button
                      onClick={() => {
                        activeIssues.forEach(issue => onDismiss(watchtowerIssueKey(issue)));
                      }}
                      className="btn btn-sm btn-outline"
                    >
                        Dismiss All
                    </button>
                    )}
                  </div>
                </div>

                {/* Issues List */}
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-[450px] overflow-y-auto">
                  {issues.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 mb-1">All Clear!</h3>
                      <p className="text-sm text-slate-500">No security issues detected. Your vault is secure.</p>
                    </div>
                  ) : (
                    issues.map((issue, index) => {
                      const key = watchtowerIssueKey(issue);
                      const dismissedIssue = dismissed.includes(key);
                      return (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 flex items-start justify-between gap-3 transition-all ${
                            dismissedIssue 
                              ? 'bg-slate-50 opacity-60' 
                              : issue.severity === 'high'
                              ? 'bg-red-50/50 hover:bg-red-50'
                              : issue.severity === 'medium'
                              ? 'bg-amber-50/50 hover:bg-amber-50'
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              issue.severity === 'high' ? 'bg-red-500' :
                              issue.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${severityBadge[issue.severity]}`}>
                                {severityLabel[issue.severity]}
                              </span>
                              {dismissedIssue && (
                                  <span className="text-[11px] text-slate-500 italic">(dismissed)</span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-900">{issue.entryName}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{issue.message}</p>
                              {issue.type === 'compromised' && (
                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-[11px] font-medium">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <span>Found in data breaches</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {!dismissedIssue && (
                            <button
                              onClick={() => onDismiss(key)}
                              className="btn btn-sm btn-outline flex-shrink-0"
                            >
                              Dismiss
                            </button>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WatchtowerModal;

