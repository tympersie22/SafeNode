/**
 * Travel Mode - Temporarily hide vaults in insecure environments
 * 
 * When enabled, all vault entries are hidden from the UI.
 * The vault data remains encrypted in storage but is not displayed.
 */

import React from 'react';

const TRAVEL_MODE_KEY = 'safenode_travel_mode';
const TRAVEL_MODE_ENABLED_KEY = 'safenode_travel_enabled';

/**
 * Check if travel mode is currently enabled
 */
export function isTravelModeEnabled(): boolean {
  try {
    const stored = localStorage.getItem(TRAVEL_MODE_ENABLED_KEY);
    if (!stored) return false;
    
    // Simple obfuscation - in production, consider encrypting this
    const decoded = atob(stored);
    return decoded === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable travel mode
 */
export function enableTravelMode(): void {
  try {
    // Store obfuscated value
    const encoded = btoa('true');
    localStorage.setItem(TRAVEL_MODE_ENABLED_KEY, encoded);
    localStorage.setItem(TRAVEL_MODE_KEY, Date.now().toString());
  } catch (error) {
    console.error('Failed to enable travel mode:', error);
  }
}

/**
 * Disable travel mode
 */
export function disableTravelMode(): void {
  try {
    localStorage.removeItem(TRAVEL_MODE_ENABLED_KEY);
    localStorage.removeItem(TRAVEL_MODE_KEY);
  } catch (error) {
    console.error('Failed to disable travel mode:', error);
  }
}

/**
 * Get travel mode activation timestamp
 */
export function getTravelModeTimestamp(): number | null {
  try {
    const stored = localStorage.getItem(TRAVEL_MODE_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * React hook for travel mode state
 */
export function useTravelMode() {
  const [isEnabled, setIsEnabled] = React.useState(isTravelModeEnabled);

  React.useEffect(() => {
    const checkTravelMode = () => {
      setIsEnabled(isTravelModeEnabled());
    };

    // Check on mount
    checkTravelMode();

    // Listen for storage changes (in case another tab changes it)
    window.addEventListener('storage', checkTravelMode);
    return () => window.removeEventListener('storage', checkTravelMode);
  }, []);

  const enable = React.useCallback(() => {
    enableTravelMode();
    setIsEnabled(true);
  }, []);

  const disable = React.useCallback(() => {
    disableTravelMode();
    setIsEnabled(false);
  }, []);

  return { isEnabled, enable, disable };
}

