/**
 * SafeNode Extension - Content Script
 * Detects password fields and injects autofill UI
 */

class SafeNodeAutofill {
  constructor() {
    this.injectedElements = new Set();
    this.isUnlocked = false;
    this.vaultData = null;
    this.init();
  }

  async init() {
    // Check if vault is unlocked
    await this.checkVaultStatus();
    
    // Start observing for password fields
    this.startObserver();
    
    // Listen for vault status changes
    this.setupMessageListener();
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
      console.log('SafeNode: Failed to check vault status', error);
    }
  }

  async loadVaultData() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getVaultData' });
      if (response.success && response.data) {
        this.vaultData = response.data;
      }
    } catch (error) {
      console.log('SafeNode: Failed to load vault data', error);
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'vaultStatusChanged') {
        this.handleVaultStatusChange(request.isUnlocked);
      }
    });
  }

  async handleVaultStatusChange(isUnlocked) {
    this.isUnlocked = isUnlocked;
    if (isUnlocked) {
      await this.loadVaultData();
      this.injectAutofillButtons();
    } else {
      this.removeAutofillButtons();
    }
  }

  startObserver() {
    // Create observer for password fields
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.scanForPasswordFields(node);
          }
        });
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also scan existing fields
    this.scanForPasswordFields(document.body);
  }

  scanForPasswordFields(container) {
    // Find password input fields
    const passwordFields = container.querySelectorAll('input[type="password"]');
    
    passwordFields.forEach(field => {
      if (!this.injectedElements.has(field)) {
        this.injectAutofillButton(field);
        this.injectedElements.add(field);
      }
    });

    // Also check for email/username fields that might be part of login forms
    const emailFields = container.querySelectorAll('input[type="email"], input[name*="email"], input[name*="username"], input[name*="login"]');
    
    emailFields.forEach(field => {
      if (!this.injectedElements.has(field)) {
        this.injectAutofillButton(field);
        this.injectedElements.add(field);
      }
    });
  }

  injectAutofillButton(field) {
    if (!this.isUnlocked || !this.vaultData) return;

    // Create autofill button
    const button = document.createElement('div');
    button.className = 'safenode-autofill-button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
      </svg>
    `;
    
    // Position the button
    this.positionButton(field, button);
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showAutofillMenu(field, button);
    });

    // Add to page
    document.body.appendChild(button);
  }

  positionButton(field, button) {
    const rect = field.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    button.style.position = 'absolute';
    button.style.left = `${rect.right + scrollLeft - 40}px`;
    button.style.top = `${rect.top + scrollTop + 2}px`;
    button.style.zIndex = '10000';
  }

  showAutofillMenu(field, button) {
    // Remove existing menu
    const existingMenu = document.querySelector('.safenode-autofill-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Find matching entries
    const matchingEntries = this.findMatchingEntries(field);
    
    if (matchingEntries.length === 0) {
      this.showNoMatchesMenu(button);
      return;
    }

    // Create menu
    const menu = document.createElement('div');
    menu.className = 'safenode-autofill-menu';
    
    // Add entries
    matchingEntries.forEach(entry => {
      const menuItem = document.createElement('div');
      menuItem.className = 'safenode-menu-item';
      menuItem.innerHTML = `
        <div class="safenode-entry-icon">${entry.name.charAt(0).toUpperCase()}</div>
        <div class="safenode-entry-info">
          <div class="safenode-entry-name">${entry.name}</div>
          <div class="safenode-entry-username">${entry.username}</div>
        </div>
      `;
      
      menuItem.addEventListener('click', () => {
        this.autofillEntry(field, entry);
        menu.remove();
      });
      
      menu.appendChild(menuItem);
    });

    // Position menu
    const rect = button.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    menu.style.position = 'absolute';
    menu.style.left = `${rect.left + scrollLeft - 200}px`;
    menu.style.top = `${rect.bottom + scrollTop + 5}px`;
    menu.style.zIndex = '10001';

    document.body.appendChild(menu);

    // Close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
  }

  showNoMatchesMenu(button) {
    const menu = document.createElement('div');
    menu.className = 'safenode-autofill-menu';
    menu.innerHTML = `
      <div class="safenode-menu-item safenode-no-matches">
        <div class="safenode-entry-icon">🔒</div>
        <div class="safenode-entry-info">
          <div class="safenode-entry-name">No matches found</div>
          <div class="safenode-entry-username">Open SafeNode to add entries</div>
        </div>
      </div>
    `;

    const rect = button.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    menu.style.position = 'absolute';
    menu.style.left = `${rect.left + scrollLeft - 200}px`;
    menu.style.top = `${rect.bottom + scrollTop + 5}px`;
    menu.style.zIndex = '10001';

    document.body.appendChild(menu);

    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
  }

  findMatchingEntries(field) {
    if (!this.vaultData || !this.vaultData.entries) return [];

    const fieldType = field.type;
    const fieldName = (field.name || '').toLowerCase();
    const fieldId = (field.id || '').toLowerCase();
    const fieldPlaceholder = (field.placeholder || '').toLowerCase();

    return this.vaultData.entries.filter(entry => {
      // Match by URL domain
      if (entry.url) {
        const url = new URL(entry.url);
        const currentDomain = window.location.hostname;
        if (url.hostname.includes(currentDomain) || currentDomain.includes(url.hostname)) {
          return true;
        }
      }

      // Match by field characteristics
      if (fieldType === 'password') {
        return true; // Show all entries for password fields
      }

      if (fieldType === 'email' || fieldName.includes('email') || fieldName.includes('username')) {
        return entry.username.includes('@'); // Email entries
      }

      return false;
    });
  }

  autofillEntry(field, entry) {
    const form = field.closest('form');
    
    if (field.type === 'password') {
      // Find username field in the same form
      const usernameField = form ? form.querySelector('input[type="email"], input[type="text"], input[name*="email"], input[name*="username"]') : null;
      
      if (usernameField) {
        usernameField.value = entry.username;
        usernameField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      field.value = entry.password;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // Fill username/email field
      field.value = entry.username;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Show success feedback
    this.showSuccessFeedback(field);
  }

  showSuccessFeedback(field) {
    const feedback = document.createElement('div');
    feedback.className = 'safenode-success-feedback';
    feedback.textContent = '✓ Filled by SafeNode';
    
    const rect = field.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    feedback.style.position = 'absolute';
    feedback.style.left = `${rect.left + scrollLeft}px`;
    feedback.style.top = `${rect.bottom + scrollTop + 5}px`;
    feedback.style.zIndex = '10002';

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 2000);
  }

  removeAutofillButtons() {
    const buttons = document.querySelectorAll('.safenode-autofill-button');
    buttons.forEach(button => button.remove());
    
    const menus = document.querySelectorAll('.safenode-autofill-menu');
    menus.forEach(menu => menu.remove());
    
    this.injectedElements.clear();
  }

  injectAutofillButtons() {
    // Re-inject buttons for existing fields
    this.injectedElements.clear();
    this.scanForPasswordFields(document.body);
  }
}

// Initialize SafeNode autofill
const safeNodeAutofill = new SafeNodeAutofill();
