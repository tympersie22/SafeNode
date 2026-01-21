/**
 * Data Settings Page
 * Manage backups, exports, sync frequency
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { SaasButton } from '../../ui/SaasButton'
import { SaasCard } from '../../ui/SaasCard'
import { Download, Upload, Database, Cloud } from 'lucide-react'

export const DataSettings: React.FC = () => {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [syncFrequency, setSyncFrequency] = useState(60) // seconds

  const handleExport = async () => {
    setExporting(true)
    try {
      // Get vault from storage
      const { vaultStorage } = await import('../../storage/vaultStorage')
      await vaultStorage.init()
      const vault = await vaultStorage.getVault()
      
      if (!vault) {
        alert('No vault data to export')
        return
      }

      // Create export data
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        vault: {
          encryptedVault: vault.encryptedVault,
          iv: vault.iv,
          salt: vault.salt,
          version: vault.version
        }
      }

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `safenode-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Vault exported successfully! Store this file securely.')
    } catch (error: any) {
      console.error('Export failed:', error)
      alert('Failed to export vault: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      setImporting(true)
      try {
        const text = await file.text()
        const importData = JSON.parse(text)

        if (!importData.vault) {
          throw new Error('Invalid backup file format')
        }

        // Import vault
        const { vaultStorage } = await import('../../storage/vaultStorage')
        await vaultStorage.init()
        
        const storedVault = vaultStorage.createVault(
          importData.vault.encryptedVault,
          importData.vault.iv,
          importData.vault.salt,
          importData.vault.version
        )
        await vaultStorage.storeVault(storedVault)

        alert('Vault imported successfully! Please refresh the page.')
      } catch (error: any) {
        console.error('Import failed:', error)
        alert('Failed to import vault: ' + error.message)
      } finally {
        setImporting(false)
      }
    }

    input.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Database className="w-6 h-6" />
          Data Management
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage your vault backups, exports, and sync settings
        </p>
      </div>

      {/* Export Vault */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Export Vault
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Download an encrypted backup of your vault. Store this file securely.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ Your vault is encrypted. You'll need your master password to restore this backup.
              </p>
            </div>
            <SaasButton
              variant="primary"
              onClick={handleExport}
              isLoading={exporting}
            >
              Export Encrypted Backup
            </SaasButton>
          </div>
        </div>
      </SaasCard>

      {/* Import Vault */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Import Vault
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Restore your vault from an encrypted backup file
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-800 dark:text-red-200">
                ⚠️ Warning: This will replace your current vault. Make sure you have a backup.
              </p>
            </div>
            <SaasButton
              variant="outline"
              onClick={handleImport}
              isLoading={importing}
            >
              Import Encrypted Backup
            </SaasButton>
          </div>
        </div>
      </SaasCard>

      {/* Sync Frequency */}
      <SaasCard>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Sync Frequency
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              How often to sync your vault with the server
            </p>
            <select
              value={syncFrequency}
              onChange={(e) => {
                setSyncFrequency(parseInt(e.target.value, 10))
                localStorage.setItem('safenode_sync_frequency', e.target.value)
              }}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every minute</option>
              <option value={300}>Every 5 minutes</option>
              <option value={600}>Every 10 minutes</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Current: Sync every {syncFrequency} seconds
            </p>
          </div>
        </div>
      </SaasCard>
    </div>
  )
}
