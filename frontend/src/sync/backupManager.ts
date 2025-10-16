import { backupStorage, type VaultBackup } from '../storage/backupStorage';
import { vaultStorage } from '../storage/vaultStorage';
import type { StoredVault } from '../storage/vaultStorage';

class BackupManager {
  async createBackup(label?: string): Promise<VaultBackup> {
    const current = await vaultStorage.getVault();
    if (!current) {
      throw new Error('No vault to backup');
    }

    const backup: VaultBackup = {
      id: `${Date.now()}`,
      label,
      createdAt: Date.now(),
      vault: current
    };

    await backupStorage.saveBackup(backup);
    return backup;
  }

  async listBackups(): Promise<VaultBackup[]> {
    return backupStorage.listBackups();
  }

  async deleteBackup(id: string): Promise<void> {
    await backupStorage.deleteBackup(id);
  }

  async restoreBackup(id: string): Promise<StoredVault> {
    const backup = await backupStorage.getBackup(id);
    if (!backup) {
      throw new Error('Backup not found');
    }

    await vaultStorage.storeVault(backup.vault);
    return backup.vault;
  }

  async downloadBackup(id: string): Promise<Blob> {
    const backup = await backupStorage.getBackup(id);
    if (!backup) {
      throw new Error('Backup not found');
    }

    const payload = JSON.stringify({
      meta: {
        createdAt: backup.createdAt,
        label: backup.label,
        version: backup.vault.version
      },
      vault: backup.vault
    });

    return new Blob([payload], { type: 'application/json' });
  }
}

export const backupManager = new BackupManager();

