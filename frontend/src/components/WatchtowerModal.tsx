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
            <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Back" title="Back">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <h3 id="watchtower-title" className="text-lg font-semibold text-slate-900">Watchtower</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Close dialog">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-600">
                      Watchtower scans your vault for weak, reused, or compromised passwords.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Last breach scan: {formatRelative(lastScanAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onRescan}
                      className="btn btn-sm btn-primary"
                      disabled={scanning}
                    >
                      {scanning ? 'Scanning…' : 'Run breach scan'}
                    </button>
                    <button
                      onClick={() => {
                        activeIssues.forEach(issue => onDismiss(watchtowerIssueKey(issue)));
                      }}
                      className="btn btn-sm btn-outline"
                      disabled={activeIssues.length === 0}
                    >
                      Dismiss all
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-[420px] overflow-y-auto">
                  {issues.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No issues detected. Great work!</div>
                  ) : (
                    issues.map(issue => {
                      const key = watchtowerIssueKey(issue);
                      const dismissedIssue = dismissed.includes(key);
                      return (
                        <div key={key} className="p-4 bg-white flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${severityBadge[issue.severity]}`}>
                                {severityLabel[issue.severity]}
                              </span>
                              {dismissedIssue && (
                                <span className="text-[11px] text-slate-500">(dismissed)</span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-slate-800 mt-1">{issue.entryName}</p>
                            <p className="text-xs text-slate-600 mt-1">{issue.message}</p>
                          </div>
                          {!dismissedIssue && (
                            <button
                              onClick={() => onDismiss(key)}
                              className="btn btn-sm btn-outline"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
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

