/**
 * Audit Logs Modal
 * Displays security audit logs with filtering and export
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auditLogStorage, type AuditLog, type AuditEventType } from '../storage/auditLogs';
import Button from '../ui/Button';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterPassword: string;
  salt: ArrayBuffer;
  accountId?: string;
}

const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  onClose,
  masterPassword,
  salt,
  accountId
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<{
    eventType?: AuditEventType;
    startDate?: number;
    endDate?: number;
  }>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (isOpen) {
      initAndLoadLogs();
    }
  }, [isOpen, filter, accountId]);

  const initAndLoadLogs = async () => {
    setIsLoading(true);
    try {
      await auditLogStorage.init(masterPassword, salt);
      const loadedLogs = await auditLogStorage.getLogs({
        ...filter,
        accountId,
        limit: 500
      });
      setLogs(loadedLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const exported = await auditLogStorage.exportLogs(format);
      const blob = new Blob([exported], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
      alert('Failed to export logs');
    }
  };

  const getEventTypeColor = (eventType: AuditEventType): string => {
    if (eventType.includes('unlock') || eventType.includes('login')) return 'bg-green-100 text-green-800';
    if (eventType.includes('lock') || eventType.includes('delete')) return 'bg-red-100 text-red-800';
    if (eventType.includes('create') || eventType.includes('share')) return 'bg-blue-100 text-blue-800';
    if (eventType.includes('update') || eventType.includes('sync')) return 'bg-yellow-100 text-yellow-800';
    if (eventType.includes('failed') || eventType.includes('breach')) return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-800';
  };

  const eventTypes: AuditEventType[] = [
    'vault_unlock',
    'vault_lock',
    'entry_create',
    'entry_update',
    'entry_delete',
    'entry_view',
    'entry_share',
    'sync_complete',
    'backup_create',
    'key_rotation',
    'failed_login',
    'breach_detected'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Audit Logs</h2>
            <p className="text-sm text-slate-500 mt-1">Security event history and activity tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => handleExport('json')} variant="outline" size="sm">
              Export JSON
            </Button>
            <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
              Export CSV
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              ✕
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-3">
            <select
              value={filter.eventType || ''}
              onChange={(e) => setFilter({ ...filter, eventType: e.target.value as AuditEventType || undefined })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Event Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filter.startDate ? new Date(filter.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setFilter({
                ...filter,
                startDate: e.target.value ? new Date(e.target.value).getTime() : undefined
              })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={filter.endDate ? new Date(filter.endDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setFilter({
                ...filter,
                endDate: e.target.value ? new Date(e.target.value + 'T23:59:59').getTime() : undefined
              })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="End Date"
            />
            {(filter.eventType || filter.startDate || filter.endDate) && (
              <Button
                onClick={() => setFilter({})}
                variant="ghost"
                size="sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-secondary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No audit logs found
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {logs.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(log.eventType)}`}>
                          {log.eventType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium text-slate-900">{log.action}</span>
                        {!log.success && (
                          <span className="text-xs text-red-600">Failed</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                        {log.entryId && ` • Entry: ${log.entryId.substring(0, 8)}...`}
                        {log.ipAddress && ` • IP: ${log.ipAddress}`}
                      </div>
                      {log.errorMessage && (
                        <div className="text-xs text-red-600 mt-1">{log.errorMessage}</div>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Total: {logs.length} logs</span>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Log Details</h3>
                <Button onClick={() => setSelectedLog(null)} variant="ghost" size="sm">
                  ✕
                </Button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Event Type:</span>
                  <span className="ml-2 text-slate-900">{selectedLog.eventType}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Action:</span>
                  <span className="ml-2 text-slate-900">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Timestamp:</span>
                  <span className="ml-2 text-slate-900">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
                {selectedLog.userId && (
                  <div>
                    <span className="font-medium text-slate-700">User ID:</span>
                    <span className="ml-2 text-slate-900">{selectedLog.userId}</span>
                  </div>
                )}
                {selectedLog.accountId && (
                  <div>
                    <span className="font-medium text-slate-700">Account ID:</span>
                    <span className="ml-2 text-slate-900">{selectedLog.accountId}</span>
                  </div>
                )}
                {selectedLog.entryId && (
                  <div>
                    <span className="font-medium text-slate-700">Entry ID:</span>
                    <span className="ml-2 text-slate-900">{selectedLog.entryId}</span>
                  </div>
                )}
                {selectedLog.ipAddress && (
                  <div>
                    <span className="font-medium text-slate-700">IP Address:</span>
                    <span className="ml-2 text-slate-900">{selectedLog.ipAddress}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-slate-700">Success:</span>
                  <span className={`ml-2 ${selectedLog.success ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedLog.success ? 'Yes' : 'No'}
                  </span>
                </div>
                {selectedLog.errorMessage && (
                  <div>
                    <span className="font-medium text-slate-700">Error:</span>
                    <span className="ml-2 text-red-600">{selectedLog.errorMessage}</span>
                  </div>
                )}
                {selectedLog.details && (
                  <div>
                    <span className="font-medium text-slate-700">Details:</span>
                    <pre className="mt-2 p-3 bg-slate-50 rounded text-xs overflow-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditLogsModal;

