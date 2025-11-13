/**
 * SafeNode Extension - Popup Script
 * Handles popup UI interactions and vault communication
 */

class SafeNodePopup {
  constructor() {
    this.isUnlocked = false;
    this.vaultData = null;
    this.filteredEntries = [];
    this.init();
  }

  async init() {
    await this.checkVaultStatus();
    this.setupEventListeners();
    this.updateUI();
  }

  async checkVaultStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getVaultStatus' });
      if (response.success) {
        this.isUnlocked = response.isUnlocked;
        if (response.isUnlocked) {
          await this.loadVaultData();
        }
      }
    } catch (error) {
      console.error('Failed to check vault status:', error);
      this.showErrorState();
    }
  }

  async loadVaultData() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getVaultData' });
      if (response.success && response.data) {
        this.vaultData = response.data;
        this.filteredEntries = response.data.entries || [];
      }
    } catch (error) {
      console.error('Failed to load vault data:', error);
    }
  }

  setupEventListeners() {
    // Unlock form
    const passwordInput = document.getElementById('password-input');
    const unlockButton = document.getElementById('unlock-button');
    
    if (passwordInput && unlockButton) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleUnlock();
        }
      });
      
      unlockButton.addEventListener('click', () => {
        this.handleUnlock();
      });
    }

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterEntries(e.target.value);
      });
    }

    // Quick actions
    const addEntryButton = document.getElementById('add-entry-button');
    const lockVaultButton = document.getElementById('lock-vault-button');
    const openAppButton = document.getElementById('open-app-button');
    const retryButton = document.getElementById('retry-button');
    const syncButton = document.getElementById('sync-button');

    if (addEntryButton) {
      addEntryButton.addEventListener('click', () => {
        this.openMainApp();
      });
    }

    if (lockVaultButton) {
      lockVaultButton.addEventListener('click', () => {
        this.handleLock();
      });
    }

    if (openAppButton) {
      openAppButton.addEventListener('click', () => {
        this.openMainApp();
      });
    }

    if (retryButton) {
      retryButton.addEventListener('click', () => {
        this.init();
      });
    }

    if (syncButton) {
      syncButton.addEventListener('click', () => {
        this.handleSync();
      });
    }
  }

  async handleUnlock() {
    const passwordInput = document.getElementById('password-input');
    const unlockButton = document.getElementById('unlock-button');
    
    if (!passwordInput || !unlockButton) return;

    const password = passwordInput.value.trim();
    if (!password) return;

    unlockButton.disabled = true;
    unlockButton.textContent = 'Unlocking...';

    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'unlockVault', 
        password: password 
      });

      if (response.success) {
        this.isUnlocked = true;
        await this.loadVaultData();
        this.updateUI();
      } else {
        this.showError('Invalid password');
      }
    } catch (error) {
      this.showError('Failed to unlock vault');
    } finally {
      unlockButton.disabled = false;
      unlockButton.textContent = 'Unlock Vault';
    }
  }

  async handleLock() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'lockVault' });
      if (response.success) {
        this.isUnlocked = false;
        this.vaultData = null;
        this.filteredEntries = [];
        this.updateUI();
      }
    } catch (error) {
      console.error('Failed to lock vault:', error);
    }
  }

  async handleSync() {
    const syncButton = document.getElementById('sync-button');
    if (syncButton) {
      syncButton.style.animation = 'spin 1s linear infinite';
    }

    try {
      // Try to sync with main app
      await this.checkVaultStatus();
      this.updateUI();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      if (syncButton) {
        syncButton.style.animation = '';
      }
    }
  }

  filterEntries(query) {
    if (!this.vaultData || !this.vaultData.entries) {
      this.filteredEntries = [];
      this.renderEntries();
      return;
    }

    const searchTerm = query.toLowerCase();
    this.filteredEntries = this.vaultData.entries.filter(entry => {
      return entry.name.toLowerCase().includes(searchTerm) ||
             entry.username.toLowerCase().includes(searchTerm) ||
             (entry.url && entry.url.toLowerCase().includes(searchTerm));
    });

    this.renderEntries();
  }

  renderEntries() {
    const entriesList = document.getElementById('entries-list');
    if (!entriesList) return;

    if (this.filteredEntries.length === 0) {
      entriesList.innerHTML = `
        <div class="no-entries">
          <div class="no-entries-icon">🔍</div>
          <p>No entries found</p>
        </div>
      `;
      return;
    }

    entriesList.innerHTML = this.filteredEntries.map(entry => `
      <div class="entry-item" data-entry-id="${entry.id}">
        <div class="entry-icon">${entry.name.charAt(0).toUpperCase()}</div>
        <div class="entry-info">
          <div class="entry-name">${this.escapeHtml(entry.name)}</div>
          <div class="entry-username">${this.escapeHtml(entry.username)}</div>
        </div>
        <div class="entry-actions">
          <button class="action-button" title="Copy password" data-action="copy" data-entry-id="${entry.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    // Add click handlers for entries
    entriesList.addEventListener('click', (e) => {
      const entryItem = e.target.closest('.entry-item');
      const actionButton = e.target.closest('.action-button');
      
      if (actionButton && actionButton.dataset.action === 'copy') {
        this.copyPassword(actionButton.dataset.entryId);
      } else if (entryItem) {
        this.fillCurrentPage(entryItem.dataset.entryId);
      }
    });
  }

  async copyPassword(entryId) {
    const entry = this.filteredEntries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      await navigator.clipboard.writeText(entry.password);
      this.showToast('Password copied!');
    } catch (error) {
      console.error('Failed to copy password:', error);
      this.showToast('Failed to copy password');
    }
  }

  async fillCurrentPage(entryId) {
    const entry = this.filteredEntries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      // Send message to content script to fill the current page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'fillPage',
        entry: entry
      });
      
      this.showToast('Filled current page');
      window.close(); // Close popup after filling
    } catch (error) {
      console.error('Failed to fill page:', error);
      this.showToast('Failed to fill page');
    }
  }

  openMainApp() {
    chrome.tabs.create({ url: 'http://localhost:5174' });
  }

  updateUI() {
    this.updateStatusIndicator();
    this.showCorrectState();
    
    if (this.isUnlocked) {
      this.renderEntries();
    }
  }

  updateStatusIndicator() {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (!statusDot || !statusText) return;

    if (this.isUnlocked) {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'Unlocked';
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Locked';
    }
  }

  showCorrectState() {
    const lockedState = document.getElementById('locked-state');
    const unlockedState = document.getElementById('unlocked-state');
    const errorState = document.getElementById('error-state');

    [lockedState, unlockedState, errorState].forEach(el => {
      if (el) el.classList.add('hidden');
    });

    if (this.isUnlocked) {
      if (unlockedState) unlockedState.classList.remove('hidden');
    } else {
      if (lockedState) lockedState.classList.remove('hidden');
    }
  }

  showErrorState() {
    const lockedState = document.getElementById('locked-state');
    const unlockedState = document.getElementById('unlocked-state');
    const errorState = document.getElementById('error-state');

    [lockedState, unlockedState].forEach(el => {
      if (el) el.classList.add('hidden');
    });

    if (errorState) errorState.classList.remove('hidden');
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#dc2626' : '#10b981'};
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 1000;
      animation: fadeInOut 3s ease-in-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0%, 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .no-entries {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
  }
  
  .no-entries-icon {
    font-size: 32px;
    margin-bottom: 12px;
  }
  
  .no-entries p {
    font-size: 14px;
  }
`;
document.head.appendChild(style);

// Initialize popup
const popup = new SafeNodePopup();
