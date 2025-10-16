import { vaultSync } from './vaultSync';
import type { SyncResult } from './vaultSync';

export type SyncStatus = 'idle' | 'syncing' | 'error';

type Listener = (status: SyncStatus, info: { lastSyncedAt: number | null }) => void;

class SyncManager {
  private status: SyncStatus = 'idle';
  private lastSyncedAt: number | null = null;
  private listeners = new Set<Listener>();
  private timer: number | null = null;
  private isRunning = false;

  private setStatus(status: SyncStatus) {
    this.status = status;
    const info = { lastSyncedAt: this.lastSyncedAt };
    for (const listener of this.listeners) {
      listener(status, info);
    }
  }

  async syncOnce(): Promise<SyncResult> {
    this.setStatus('syncing');
    try {
      const result = await vaultSync.syncVault();
      this.lastSyncedAt = Date.now();
      this.setStatus('idle');
      return result;
    } catch (error) {
      console.error('syncManager.syncOnce failed:', error);
      this.setStatus('error');
      throw error;
    }
  }

  start(intervalMs = 60_000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = async () => {
      try {
        await this.syncOnce();
      } catch {
        // error already logged in syncOnce
      }
    };

    // Initial sync immediately, but don't await to avoid blocking callers
    tick();

    this.timer = window.setInterval(tick, intervalMs);
    window.addEventListener('online', this.handleOnline);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }

    window.removeEventListener('online', this.handleOnline);
  }

  getStatus(): { status: SyncStatus; lastSyncedAt: number | null } {
    return { status: this.status, lastSyncedAt: this.lastSyncedAt };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Emit immediately with current status
    listener(this.status, { lastSyncedAt: this.lastSyncedAt });
    return () => this.listeners.delete(listener);
  }

  private handleOnline = () => {
    if (this.isRunning) {
      this.syncOnce().catch(() => {});
    }
  };
}

export const syncManager = new SyncManager();

