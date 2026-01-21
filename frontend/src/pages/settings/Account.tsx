/**
 * Account Settings Page
 * Logout, delete account, support
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { LogOut, Trash2, HelpCircle, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { logout } from '../../services/authService'

export const AccountSettings: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout: authLogout } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleLogout = () => {
    logout()
    authLogout()
    navigate('/')
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      // TODO: Implement account deletion API call
      alert('Account deletion is not yet implemented. Please contact support.')
      setShowDeleteConfirm(false)
    } catch (error: any) {
      console.error('Failed to delete account:', error)
      alert('Failed to delete account: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <User className="w-6 h-6" />
          Account Settings
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Account Info */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Account Information
            </h3>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
              <p><strong>User ID:</strong> {user?.id || 'Not available'}</p>
              <p><strong>Account Created:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
            </div>
          </div>
        </div>
      </SaasCard>

      {/* Logout */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Logout
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Sign out of your account. You'll need to log in again to access your vault.
            </p>
            <SaasButton
              variant="outline"
              onClick={handleLogout}
            >
              Logout
            </SaasButton>
          </div>
        </div>
      </SaasCard>

      {/* Delete Account */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Delete Account
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-800 dark:text-red-200">
                ⚠️ Warning: This will permanently delete your account, vault, and all data. This action cannot be undone.
              </p>
            </div>
            <SaasButton
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Delete Account
            </SaasButton>
          </div>
        </div>
      </SaasCard>

      {/* Support */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Support
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Need help? Contact our support team
            </p>
            <div className="space-y-2">
              <a
                href="mailto:support@safenode.app"
                className="text-sm text-secondary-600 dark:text-secondary-400 hover:underline"
              >
                support@safenode.app
              </a>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Response time: Usually within 24 hours
              </p>
            </div>
          </div>
        </div>
      </SaasCard>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Account</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 dark:text-red-200">
                Are you sure you want to delete your account? This will permanently delete:
              </p>
              <ul className="mt-2 text-xs text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                <li>Your account and profile</li>
                <li>All vault entries and data</li>
                <li>All backups and sync data</li>
                <li>All settings and preferences</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <SaasButton
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </SaasButton>
              <SaasButton
                onClick={handleDeleteAccount}
                variant="primary"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                isLoading={deleting}
              >
                Delete Account
              </SaasButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
