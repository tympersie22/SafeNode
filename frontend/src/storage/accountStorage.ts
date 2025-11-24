/**
 * SafeNode Multi-Account Storage
 * Manages multiple vault accounts (personal, work, etc.)
 */

export interface Account {
  id: string;
  name: string;
  email: string;
  type: 'personal' | 'work' | 'shared' | 'team';
  createdAt: number;
  lastAccessed: number;
  isActive: boolean;
  vaultId: string; // Reference to vault storage
  settings?: {
    autoLock?: number; // minutes
    theme?: 'light' | 'dark' | 'auto';
    biometricEnabled?: boolean;
    pinEnabled?: boolean;
  };
  metadata?: {
    entryCount?: number;
    lastSync?: number;
    storageUsed?: number; // bytes
  };
}

const STORAGE_KEY = 'safenode_accounts';
const ACTIVE_ACCOUNT_KEY = 'safenode_active_account';

class AccountStorage {
  private accounts: Map<string, Account> = new Map();
  private activeAccountId: string | null = null;

  async init(): Promise<void> {
    // Load accounts from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const accountsArray = JSON.parse(stored) as Account[];
        accountsArray.forEach(account => {
          this.accounts.set(account.id, account);
        });
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    }

    // Load active account
    const activeId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (activeId && this.accounts.has(activeId)) {
      this.activeAccountId = activeId;
    } else if (this.accounts.size > 0) {
      // Set first account as active if no active account
      this.activeAccountId = Array.from(this.accounts.keys())[0];
      await this.saveActiveAccount();
    }
  }

  private async saveAccounts(): Promise<void> {
    const accountsArray = Array.from(this.accounts.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accountsArray));
  }

  private async saveActiveAccount(): Promise<void> {
    if (this.activeAccountId) {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, this.activeAccountId);
    } else {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  }

  async createAccount(
    name: string,
    email: string,
    type: Account['type'] = 'personal',
    vaultId?: string
  ): Promise<Account> {
    const account: Account = {
      id: `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      type,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      isActive: true,
      vaultId: vaultId || `vault-${Date.now()}`,
      settings: {
        autoLock: 30, // 30 minutes default
        theme: 'auto',
        biometricEnabled: false,
        pinEnabled: false
      },
      metadata: {
        entryCount: 0,
        lastSync: Date.now(),
        storageUsed: 0
      }
    };

    this.accounts.set(account.id, account);
    await this.saveAccounts();

    // Set as active if it's the first account
    if (!this.activeAccountId) {
      this.activeAccountId = account.id;
      await this.saveActiveAccount();
    }

    return account;
  }

  async getAccount(id: string): Promise<Account | null> {
    return this.accounts.get(id) || null;
  }

  async getAllAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getActiveAccount(): Promise<Account | null> {
    if (!this.activeAccountId) return null;
    return this.accounts.get(this.activeAccountId) || null;
  }

  async setActiveAccount(id: string): Promise<void> {
    if (!this.accounts.has(id)) {
      throw new Error(`Account ${id} not found`);
    }

    // Update last accessed for previous active account
    if (this.activeAccountId) {
      const prevAccount = this.accounts.get(this.activeAccountId);
      if (prevAccount) {
        prevAccount.lastAccessed = Date.now();
        this.accounts.set(this.activeAccountId, prevAccount);
      }
    }

    this.activeAccountId = id;
    const account = this.accounts.get(id);
    if (account) {
      account.lastAccessed = Date.now();
      account.isActive = true;
      this.accounts.set(id, account);
    }

    // Deactivate other accounts
    this.accounts.forEach((acc, accId) => {
      if (accId !== id) {
        acc.isActive = false;
        this.accounts.set(accId, acc);
      }
    });

    await this.saveAccounts();
    await this.saveActiveAccount();
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error(`Account ${id} not found`);
    }

    const updated = { ...account, ...updates };
    this.accounts.set(id, updated);
    await this.saveAccounts();

    return updated;
  }

  async deleteAccount(id: string): Promise<void> {
    if (this.accounts.size === 1) {
      throw new Error('Cannot delete the last account');
    }

    if (this.activeAccountId === id) {
      // Switch to another account
      const otherAccounts = Array.from(this.accounts.keys()).filter(accId => accId !== id);
      if (otherAccounts.length > 0) {
        await this.setActiveAccount(otherAccounts[0]);
      }
    }

    this.accounts.delete(id);
    await this.saveAccounts();
  }

  async updateAccountMetadata(id: string, metadata: Partial<Account['metadata']>): Promise<void> {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error(`Account ${id} not found`);
    }

    account.metadata = { ...account.metadata, ...metadata };
    this.accounts.set(id, account);
    await this.saveAccounts();
  }

  async updateAccountSettings(id: string, settings: Partial<Account['settings']>): Promise<void> {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error(`Account ${id} not found`);
    }

    account.settings = { ...account.settings, ...settings };
    this.accounts.set(id, account);
    await this.saveAccounts();
  }
}

export const accountStorage = new AccountStorage();

