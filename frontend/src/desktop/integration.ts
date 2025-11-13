/**
 * SafeNode Desktop Integration
 * Handles communication between frontend and Tauri backend
 */

// Check if we're running in Tauri
export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Tauri API interface
interface TauriAPI {
  invoke: (command: string, args?: any) => Promise<any>;
}

declare global {
  interface Window {
    __TAURI__?: {
      tauri: TauriAPI;
    };
  }
}

// Desktop-specific vault operations
export class DesktopVault {
  private static instance: DesktopVault;

  static getInstance(): DesktopVault {
    if (!DesktopVault.instance) {
      DesktopVault.instance = new DesktopVault();
    }
    return DesktopVault.instance;
  }

  async unlockVault(password: string): Promise<boolean> {
    if (!isTauri()) return false;
    
    try {
      const result = await window.__TAURI__?.tauri.invoke('unlock_vault', { password });
      return result === true;
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      return false;
    }
  }

  async lockVault(): Promise<void> {
    if (!isTauri()) return;
    
    try {
      await window.__TAURI__?.tauri.invoke('lock_vault');
    } catch (error) {
      console.error('Failed to lock vault:', error);
    }
  }

  async getVaultStatus(): Promise<boolean> {
    if (!isTauri()) return false;
    
    try {
      const result = await window.__TAURI__?.tauri.invoke('get_vault_status');
      return result === true;
    } catch (error) {
      console.error('Failed to get vault status:', error);
      return false;
    }
  }

  async saveToKeychain(service: string, account: string, password: string): Promise<void> {
    if (!isTauri()) return;
    
    try {
      await window.__TAURI__?.tauri.invoke('save_to_keychain', {
        service,
        account,
        password
      });
    } catch (error) {
      console.error('Failed to save to keychain:', error);
    }
  }

  async getFromKeychain(service: string, account: string): Promise<string | null> {
    if (!isTauri()) return null;
    
    try {
      const result = await window.__TAURI__?.tauri.invoke('get_from_keychain', {
        service,
        account
      });
      return result || null;
    } catch (error) {
      console.error('Failed to get from keychain:', error);
      return null;
    }
  }

  async copyToClipboard(text: string): Promise<void> {
    if (!isTauri()) {
      // Fallback to web clipboard API
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
      return;
    }
    
    try {
      await window.__TAURI__?.tauri.invoke('copy_to_clipboard', { text });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  async showSystemTray(): Promise<void> {
    if (!isTauri()) return;
    
    try {
      await window.__TAURI__?.tauri.invoke('show_system_tray');
    } catch (error) {
      console.error('Failed to show system tray:', error);
    }
  }

  async showMainWindow(): Promise<void> {
    if (!isTauri()) return;
    
    try {
      await window.__TAURI__?.tauri.invoke('show_main_window');
    } catch (error) {
      console.error('Failed to show main window:', error);
    }
  }
}

// Enhanced copy functionality for desktop
export const enhancedCopyToClipboard = async (text: string): Promise<void> => {
  if (isTauri()) {
    const desktopVault = DesktopVault.getInstance();
    await desktopVault.copyToClipboard(text);
  } else {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }
};

// Desktop-specific UI enhancements
export const setupDesktopFeatures = () => {
  if (!isTauri()) return;

  // Add desktop-specific CSS classes
  document.body.classList.add('desktop-app');

  // Add keyboard shortcuts for desktop
  document.addEventListener('keydown', (event) => {
    // Cmd/Ctrl + Shift + T: Show/hide system tray
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      const desktopVault = DesktopVault.getInstance();
      desktopVault.showSystemTray();
    }

    // Cmd/Ctrl + Shift + L: Lock vault
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'L') {
      event.preventDefault();
      const desktopVault = DesktopVault.getInstance();
      desktopVault.lockVault();
    }
  });

  // Add desktop menu bar (if needed)
  const menuBar = document.createElement('div');
  menuBar.className = 'desktop-menu-bar';
  menuBar.innerHTML = `
    <div class="desktop-menu-item" onclick="window.__TAURI__.tauri.invoke('show_system_tray')">
      Hide to Tray
    </div>
    <div class="desktop-menu-item" onclick="window.__TAURI__.tauri.invoke('lock_vault')">
      Lock Vault
    </div>
  `;
  
  document.body.insertBefore(menuBar, document.body.firstChild);
};

// Initialize desktop features when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDesktopFeatures);
  } else {
    setupDesktopFeatures();
  }
}
