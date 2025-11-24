/**
 * SafeNode Extension - Background Script
 * Handles vault communication and storage management
 */

// Vault data cache
let vaultCache = null;
let lastSyncTime = 0;
const SYNC_INTERVAL = 30000; // 30 seconds

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('SafeNode extension installed');
  
  // Set default storage values
  chrome.storage.local.set({
    vaultData: null,
    isUnlocked: false,
    lastSync: 0
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getVaultData':
      handleGetVaultData(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'saveVaultData':
      handleSaveVaultData(request.data, sendResponse);
      return true;
      
    case 'unlockVault':
      handleUnlockVault(request.password, sendResponse);
      return true;
      
    case 'lockVault':
      handleLockVault(sendResponse);
      return true;
      
    case 'getVaultStatus':
      handleGetVaultStatus(sendResponse);
      return true;
      
    case 'saveCredential':
      handleSaveCredential(request.entry, sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Get cached vault data
async function handleGetVaultData(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['vaultData', 'isUnlocked']);
    sendResponse({
      success: true,
      data: result.vaultData,
      isUnlocked: result.isUnlocked
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Save vault data to storage
async function handleSaveVaultData(vaultData, sendResponse) {
  try {
    await chrome.storage.local.set({
      vaultData: vaultData,
      lastSync: Date.now()
    });
    vaultCache = vaultData;
    lastSyncTime = Date.now();
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Unlock vault with password
async function handleUnlockVault(password, sendResponse) {
  try {
    // Get stored vault data
    const result = await chrome.storage.local.get(['vaultData']);
    
    if (!result.vaultData) {
      sendResponse({ success: false, error: 'No vault data found' });
      return;
    }

    // In a real implementation, you would decrypt the vault here
    // For now, we'll use a simple demo password check
    if (password === 'demo-password') {
      await chrome.storage.local.set({ isUnlocked: true });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Invalid password' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Lock vault
async function handleLockVault(sendResponse) {
  try {
    await chrome.storage.local.set({ isUnlocked: false });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Get vault status
async function handleGetVaultStatus(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['isUnlocked', 'vaultData', 'lastSync']);
    sendResponse({
      success: true,
      isUnlocked: result.isUnlocked || false,
      hasVault: !!result.vaultData,
      lastSync: result.lastSync || 0
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Sync with main app (if running on localhost)
async function syncWithMainApp() {
  try {
    // Try to fetch from main app
    const response = await fetch('http://localhost:4000/api/vault/latest');
    if (response.ok) {
      const vaultData = await response.json();
      await chrome.storage.local.set({
        vaultData: vaultData,
        lastSync: Date.now()
      });
      vaultCache = vaultData;
      lastSyncTime = Date.now();
    }
  } catch (error) {
    console.log('Main app not available for sync');
  }
}

// Periodic sync
setInterval(syncWithMainApp, SYNC_INTERVAL);

// Save credential to vault
async function handleSaveCredential(entry, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['vaultData']);
    let vaultData = result.vaultData || { entries: [] };
    
    // Add new entry
    if (!vaultData.entries) {
      vaultData.entries = [];
    }
    
    // Check if entry already exists
    const exists = vaultData.entries.some(e => e.id === entry.id || 
      (e.url && entry.url && new URL(e.url.startsWith('http') ? e.url : `https://${e.url}`).hostname === 
       new URL(entry.url.startsWith('http') ? entry.url : `https://${entry.url}`).hostname &&
       e.username === entry.username));
    
    if (!exists) {
      vaultData.entries.push(entry);
      
      // Save to local storage
      await chrome.storage.local.set({
        vaultData: vaultData,
        lastSync: Date.now()
      });
      
      vaultCache = vaultData;
      lastSyncTime = Date.now();
      
      // Try to sync with main app
      try {
        await syncCredentialToMainApp(entry);
      } catch (error) {
        console.log('Failed to sync with main app:', error);
      }
      
      // Broadcast vault status change
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'vaultStatusChanged',
            isUnlocked: true
          }).catch(() => {
            // Tab might not have content script, ignore
          });
        });
      });
      
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Entry already exists' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Sync credential to main app
async function syncCredentialToMainApp(entry) {
  try {
    const response = await fetch('http://localhost:4000/api/vault/entry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entry: entry
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to sync with main app');
    }
  } catch (error) {
    // Main app might not be running, that's okay
    console.log('Main app sync failed:', error);
  }
}

// Listen for storage changes from main app
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.vaultData) {
    vaultCache = changes.vaultData.newValue;
    lastSyncTime = Date.now();
  }
});
