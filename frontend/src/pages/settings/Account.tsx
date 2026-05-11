/**
 * Account Settings Page
 * Logout, delete account, support
 */

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { LogOut, Trash2, HelpCircle, User, ShieldCheck, Clock3 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { logout } from '../../services/authService'
import {
  cancelAccountSuccessorClaim,
  getAccountSuccessor,
  revokeAccountSuccessor,
  saveAccountSuccessor,
  type AccountSuccessor
} from '../../services/accountSuccessorService'

export const AccountSettings: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout: authLogout } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingSuccessor, setSavingSuccessor] = useState(false)
  const [successor, setSuccessor] = useState<AccountSuccessor | null>(null)
  const [successorError, setSuccessorError] = useState<string | null>(null)
  const [successorMessage, setSuccessorMessage] = useState<string | null>(null)
  const [successorForm, setSuccessorForm] = useState({
    successorEmail: '',
    successorName: '',
    relationshipLabel: '',
    note: '',
    waitingPeriodDays: 14
  })

  useEffect(() => {
    getAccountSuccessor()
      .then((record) => {
        setSuccessor(record)
        if (record) {
          setSuccessorForm({
            successorEmail: record.successorEmail,
            successorName: record.successorName || '',
            relationshipLabel: record.relationshipLabel || '',
            note: record.note || '',
            waitingPeriodDays: record.waitingPeriodDays
          })
        }
      })
      .catch((error: any) => {
        setSuccessorError(error.message || 'Failed to load successor settings')
      })
  }, [])

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

  const handleSaveSuccessor = async () => {
    setSavingSuccessor(true)
    setSuccessorError(null)
    setSuccessorMessage(null)
    try {
      const record = await saveAccountSuccessor(successorForm)
      setSuccessor(record)
      setSuccessorMessage('Successor settings saved. The designated contact has been notified by email.')
    } catch (error: any) {
      setSuccessorError(error.message || 'Failed to save successor settings')
    } finally {
      setSavingSuccessor(false)
    }
  }

  const handleRevokeSuccessor = async () => {
    setSavingSuccessor(true)
    setSuccessorError(null)
    setSuccessorMessage(null)
    try {
      await revokeAccountSuccessor()
      setSuccessor(null)
      setSuccessorMessage('Successor access has been revoked.')
    } catch (error: any) {
      setSuccessorError(error.message || 'Failed to revoke successor access')
    } finally {
      setSavingSuccessor(false)
    }
  }

  const handleCancelClaim = async () => {
    setSavingSuccessor(true)
    setSuccessorError(null)
    setSuccessorMessage(null)
    try {
      await cancelAccountSuccessorClaim()
      const record = await getAccountSuccessor()
      setSuccessor(record)
      setSuccessorMessage('Pending succession claim cancelled.')
    } catch (error: any) {
      setSuccessorError(error.message || 'Failed to cancel succession claim')
    } finally {
      setSavingSuccessor(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <User className="w-6 h-6" />
          Account & Continuity
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage account ownership, continuity planning, and lifecycle controls.
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

      <SaasCard>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Account Successor
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Designate a successor who can request account-control transfer after a waiting period. This transfers account ownership, but existing encrypted vault data still depends on recovery materials you arranged beforehand.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <span>Successor email</span>
                <input
                  value={successorForm.successorEmail}
                  onChange={(e) => setSuccessorForm(prev => ({ ...prev, successorEmail: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <span>Successor name</span>
                <input
                  value={successorForm.successorName}
                  onChange={(e) => setSuccessorForm(prev => ({ ...prev, successorName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <span>Relationship</span>
                <input
                  value={successorForm.relationshipLabel}
                  onChange={(e) => setSuccessorForm(prev => ({ ...prev, relationshipLabel: e.target.value }))}
                  placeholder="Family member, attorney, executor"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <span>Waiting period</span>
                <select
                  value={successorForm.waitingPeriodDays}
                  onChange={(e) => setSuccessorForm(prev => ({ ...prev, waitingPeriodDays: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-100"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm text-slate-600 dark:text-slate-400 block">
              <span>Owner note</span>
              <textarea
                value={successorForm.note}
                onChange={(e) => setSuccessorForm(prev => ({ ...prev, note: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-slate-100"
              />
            </label>

            {successor && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                  <Clock3 className="w-4 h-4" />
                  Status: {successor.status.replace('_', ' ')}
                </div>
                {successor.claimAvailableAt && (
                  <p className="mt-2">Claim becomes eligible on {new Date(successor.claimAvailableAt).toLocaleString()}.</p>
                )}
              </div>
            )}

            {successorError && <p className="text-sm text-red-600 dark:text-red-400">{successorError}</p>}
            {successorMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{successorMessage}</p>}

            <div className="flex flex-wrap gap-3">
              <SaasButton variant="primary" onClick={handleSaveSuccessor} isLoading={savingSuccessor}>
                Save successor
              </SaasButton>
              {successor && (
                <SaasButton variant="outline" onClick={handleRevokeSuccessor} isLoading={savingSuccessor}>
                  Revoke successor
                </SaasButton>
              )}
              {successor?.status === 'claim_pending' && (
                <SaasButton variant="outline" onClick={handleCancelClaim} isLoading={savingSuccessor}>
                  Cancel pending claim
                </SaasButton>
              )}
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
              Sign out of your account. You will need to authenticate again before reopening your identity vault.
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
                href="mailto:support@safe-node.app"
                className="text-sm text-secondary-600 dark:text-secondary-400 hover:underline"
              >
                support@safe-node.app
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
