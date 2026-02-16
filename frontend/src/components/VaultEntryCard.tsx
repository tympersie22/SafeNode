/**
 * Vault Entry Card Component
 * Beautiful, functional password entry card with copy, edit, delete
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Edit2, Trash2, ExternalLink, Shield, AlertTriangle } from 'lucide-react';
import CopyButton from './ui/CopyButton';
import showToast from './ui/Toast';
import type { VaultEntry } from '../types/vault';

export interface VaultEntryCardProps {
  entry: VaultEntry;
  onEdit: (entry: VaultEntry) => void;
  onDelete: (entry: VaultEntry) => void;
  isBreached?: boolean;
}

export const VaultEntryCard: React.FC<VaultEntryCardProps> = ({
  entry,
  onEdit,
  onDelete,
  isBreached = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const getFavicon = (url: string | undefined) => {
    if (!url) return null;
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const favicon = getFavicon(entry.url);

  const handleDelete = () => {
    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      setTimeout(() => setShowConfirmDelete(false), 3000);
    } else {
      onDelete(entry);
      showToast.success(`${entry.title} deleted`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* Breach Warning Banner */}
      {isBreached && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
            <AlertTriangle className="w-3 h-3" />
            Breached
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header: Icon + Title */}
        <div className="flex items-start gap-4 mb-4">
          {/* Favicon or Default Icon */}
          <div className="flex-shrink-0">
            {favicon ? (
              <img
                src={favicon}
                alt=""
                className="w-10 h-10 rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center ${favicon ? 'hidden' : ''}`}>
              <Shield className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Title + URL */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {entry.title}
            </h3>
            {entry.url && (
              <a
                href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <span className="truncate max-w-[200px]">{entry.url}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(entry)}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              aria-label="Edit entry"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className={`p-2 rounded-lg transition-colors ${
                showConfirmDelete
                  ? 'text-white bg-red-600 hover:bg-red-700'
                  : 'text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
              aria-label={showConfirmDelete ? 'Click again to confirm deletion' : 'Delete entry'}
              title={showConfirmDelete ? 'Click again to confirm' : 'Delete'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Entry Details */}
        <div className="space-y-3">
          {/* Username/Email */}
          {entry.username && (
            <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Username</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {entry.username}
                </div>
              </div>
              <CopyButton
                value={entry.username}
                label="Copy username"
                size="md"
              />
            </div>
          )}

          {/* Password */}
          {entry.password && (
            <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Password</div>
                <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {showPassword ? (
                    <span className="select-all">{entry.password}</span>
                  ) : (
                    <span>••••••••••••</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide' : 'Show'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <CopyButton
                  value={entry.password}
                  label="Copy password"
                  size="md"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="text-xs text-amber-700 dark:text-amber-400 mb-1 font-medium">Notes</div>
              <div className="text-sm text-amber-900 dark:text-amber-200">
                {entry.notes}
              </div>
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer: Last Modified */}
          {entry.modifiedAt && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last modified {new Date(entry.modifiedAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VaultEntryCard;
