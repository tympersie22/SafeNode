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
    // Normalize container - handle both elements and document fragments
    if (!container || !(container instanceof Element || container instanceof Document || container instanceof DocumentFragment)) {
      return;
    }

    // Find password input fields - normalize detection
    const passwordFields = container.querySelectorAll('input[type="password"]');
    
    passwordFields.forEach(field => {
      // Verify it's actually an HTMLInputElement
      if (field instanceof HTMLInputElement && !this.injectedElements.has(field)) {
        this.injectAutofillButton(field);
        this.setupCredentialCapture(field);
        this.injectedElements.add(field);
      }
    });

    // Also check for email/username fields that might be part of login forms
    const emailFields = container.querySelectorAll('input[type="email"], input[type="text"][name*="email" i], input[type="text"][name*="username" i], input[type="text"][name*="login" i], input[type="text"][id*="email" i], input[type="text"][id*="username" i]');
    
    emailFields.forEach(field => {
      // Verify it's actually an HTMLInputElement
      if (field instanceof HTMLInputElement && !this.injectedElements.has(field)) {
        this.injectAutofillButton(field);
        this.injectedElements.add(field);
      }
    });
  }

  setupCredentialCapture(passwordField) {
    // Normalize field detection - ensure it's an HTMLInputElement
    if (!passwordField || !(passwordField instanceof HTMLInputElement)) {
      return;
    }

    const form = passwordField.closest('form');
    // Normalize form detection - ensure it's an HTMLFormElement
    if (!form || !(form instanceof HTMLFormElement)) {
      return;
    }

    // Detect form submission
    form.addEventListener('submit', async (e) => {
      // Wait a bit to ensure form data is captured
      setTimeout(() => {
        this.captureCredentials(form, passwordField);
      }, 100);
    }, { once: true });

    // Also detect when password field loses focus after being filled
    passwordField.addEventListener('blur', () => {
      if (passwordField.value && passwordField.value.length > 0) {
        setTimeout(() => {
          this.checkForNewCredentials(form, passwordField);
        }, 500);
      }
    });
  }

  async checkForNewCredentials(form, passwordField) {
    if (!this.isUnlocked || !this.vaultData) return;

    const usernameField = this.findUsernameField(form);
    if (!usernameField || !usernameField.value) return;

    const username = usernameField.value.trim();
    const password = passwordField.value;
    const url = window.location.href;

    // Check if this credential already exists
    const existingEntry = this.vaultData.entries?.find(entry => {
      const entryUrl = entry.url ? new URL(entry.url.startsWith('http') ? entry.url : `https://${entry.url}`) : null;
      const currentUrlObj = new URL(url);
      
      return entry.username === username && 
             entryUrl && 
             entryUrl.hostname === currentUrlObj.hostname;
    });

    if (!existingEntry && password.length >= 8) {
      // Show save prompt
      this.showSavePrompt(username, password, url);
    }
  }

  async captureCredentials(form, passwordField) {
    if (!this.isUnlocked) return;

    const usernameField = this.findUsernameField(form);
    if (!usernameField || !usernameField.value) return;

    const username = usernameField.value.trim();
    const password = passwordField.value;
    const url = window.location.href;

    // Check if already saved
    const existing = this.vaultData.entries?.find(e => 
      e.username === username && 
      e.url && 
      new URL(e.url.startsWith('http') ? e.url : `https://${e.url}`).hostname === new URL(url).hostname
    );

    if (!existing && password.length >= 8) {
      this.showSavePrompt(username, password, url);
    }
  }

  findUsernameField(form) {
    // Normalize form detection - ensure it's an HTMLFormElement
    if (!form || !(form instanceof HTMLFormElement)) {
      return null;
    }

    // Try multiple strategies to find username field
    const selectors = [
      'input[type="email"]',
      'input[type="text"][name*="email" i]',
      'input[type="text"][name*="username" i]',
      'input[type="text"][name*="login" i]',
      'input[type="text"][id*="email" i]',
      'input[type="text"][id*="username" i]',
      'input[type="text"][id*="login" i]',
      'input[type="text"][autocomplete="username"]',
      'input[type="text"][autocomplete="email"]'
    ];

    for (const selector of selectors) {
      const field = form.querySelector(selector);
      // Use instanceof check instead of assuming .control property
      if (field instanceof HTMLInputElement && field.value) {
        return field;
      }
    }

    // Fallback: find first text input before password field
    const allInputs = Array.from(form.querySelectorAll('input[type="text"], input[type="email"]'))
      .filter(input => input instanceof HTMLInputElement);
    const passwordIndex = Array.from(form.querySelectorAll('input'))
      .filter(input => input instanceof HTMLInputElement)
      .indexOf(passwordField);
    return allInputs.find(input => {
      const inputIndex = Array.from(form.querySelectorAll('input'))
        .filter(inp => inp instanceof HTMLInputElement)
        .indexOf(input);
      return inputIndex < passwordIndex;
    });
  }

  showSavePrompt(username, password, url) {
    // Remove existing prompt
    const existing = document.querySelector('.safenode-save-prompt');
    if (existing) existing.remove();

    const prompt = document.createElement('div');
    prompt.className = 'safenode-save-prompt';
    prompt.innerHTML = `
      <div class="safenode-prompt-header">
        <div class="safenode-prompt-icon">🔒</div>
        <div class="safenode-prompt-title">Save to SafeNode?</div>
      </div>
      <div class="safenode-prompt-content">
        <div class="safenode-prompt-site">${new URL(url).hostname}</div>
        <div class="safenode-prompt-username">${username}</div>
      </div>
      <div class="safenode-prompt-actions">
        <button class="safenode-prompt-btn safenode-prompt-cancel">Not now</button>
        <button class="safenode-prompt-btn safenode-prompt-save">Save</button>
      </div>
    `;

    // Position at top of page
    prompt.style.position = 'fixed';
    prompt.style.top = '20px';
    prompt.style.right = '20px';
    prompt.style.zIndex = '999999';

    document.body.appendChild(prompt);

    // Event handlers
    prompt.querySelector('.safenode-prompt-save').addEventListener('click', () => {
      this.saveCredential(username, password, url);
      prompt.remove();
    });

    prompt.querySelector('.safenode-prompt-cancel').addEventListener('click', () => {
      prompt.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.remove();
      }
    }, 10000);
  }

  async saveCredential(username, password, url) {
    try {
      const entry = {
        id: `entry_${Date.now()}`,
        name: new URL(url).hostname,
        username: username,
        password: password,
        url: url,
        category: 'Login',
        tags: [],
        passwordUpdatedAt: Date.now()
      };

      // Send to background script to save
      const response = await chrome.runtime.sendMessage({
        action: 'saveCredential',
        entry: entry
      });

      if (response.success) {
        // Reload vault data
        await this.loadVaultData();
        
        // Show success feedback
        this.showSaveSuccess();
      }
    } catch (error) {
      console.error('Failed to save credential:', error);
    }
  }

  showSaveSuccess() {
    const feedback = document.createElement('div');
    feedback.className = 'safenode-success-feedback';
    feedback.textContent = '✓ Saved to SafeNode';
    feedback.style.position = 'fixed';
    feedback.style.top = '20px';
    feedback.style.right = '20px';
    feedback.style.zIndex = '999999';
    feedback.style.backgroundColor = '#10b981';
    feedback.style.color = 'white';
    feedback.style.padding = '12px 16px';
    feedback.style.borderRadius = '8px';
    feedback.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 3000);
  }

  injectAutofillButton(field) {
    if (!this.isUnlocked || !this.vaultData) return;
    
    // Normalize field detection - ensure it's an HTMLInputElement
    if (!field || !(field instanceof HTMLInputElement)) {
      return;
    }

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

    // Normalize field detection - ensure it's an HTMLInputElement
    if (!field || !(field instanceof HTMLInputElement)) {
      return [];
    }

    const currentDomain = window.location.hostname;
    const currentUrl = window.location.href;
    const fieldType = field.type;
    const form = field.closest('form');

    // Score entries by relevance
    const scoredEntries = this.vaultData.entries.map(entry => {
      let score = 0;

      // Exact domain match
      if (entry.url) {
        try {
          const entryUrl = new URL(entry.url.startsWith('http') ? entry.url : `https://${entry.url}`);
          const entryDomain = entryUrl.hostname.replace('www.', '');
          const currentDomainClean = currentDomain.replace('www.', '');

          if (entryDomain === currentDomainClean) {
            score += 100; // Exact match
          } else if (entryDomain.includes(currentDomainClean) || currentDomainClean.includes(entryDomain)) {
            score += 50; // Partial match
          } else if (entryUrl.pathname && currentUrl.includes(entryUrl.pathname)) {
            score += 30; // Path match
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }

      // Name-based matching
      const entryName = (entry.name || '').toLowerCase();
      if (entryName.includes(currentDomain.split('.')[0])) {
        score += 20;
      }

      return { entry, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Top 5 matches
      .map(item => item.entry);

    return scoredEntries;
  }

  autofillEntry(field, entry) {
    // Normalize field detection - ensure it's an HTMLInputElement
    if (!field || !(field instanceof HTMLInputElement)) {
      return;
    }

    const form = field.closest('form');
    
    if (field.type === 'password') {
      // Find username field in the same form
      const usernameField = form && form instanceof HTMLFormElement
        ? form.querySelector('input[type="email"], input[type="text"], input[name*="email"], input[name*="username"]')
        : null;
      
      // Use instanceof check instead of assuming .control property
      if (usernameField instanceof HTMLInputElement) {
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
