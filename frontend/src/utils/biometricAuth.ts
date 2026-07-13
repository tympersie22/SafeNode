/**
 * Biometric Authentication Service
 * Unified interface for biometric authentication across all platforms
 * - Web: WebAuthn API (Windows Hello, Touch ID on macOS Safari, etc.)
 * - Desktop: Tauri platform-specific APIs
 * - Mobile: Already implemented via expo-local-authentication
 * 
 */
import { API_BASE } from '../config/api';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  credential?: any; // For WebAuthn
}

export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'voice' | 'unknown';

export interface BiometricCapabilities {
  available: boolean;
  type: BiometricType;
  enrolled: boolean;
  platform: 'web' | 'desktop' | 'mobile';
}

class BiometricAuthService {
  private isTauri: boolean = false;
  private tauriApi: any = null;
  private webAuthnSupported: boolean = false;

  constructor() {
    // Check if running in Tauri
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      this.isTauri = true;
      this.tauriApi = (window as any).__TAURI__;
    }

    // Check WebAuthn support
    if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
      this.webAuthnSupported = true;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isAvailable(): Promise<BiometricCapabilities> {
    if (this.isTauri && this.tauriApi) {
      // Desktop (Tauri)
      try {
        const { invoke } = this.tauriApi.core;
        const result = await invoke('check_biometric_available');
        return {
          available: result.available || false,
          type: this.mapBiometricType(result.type || 'unknown'),
          enrolled: result.enrolled || false,
          platform: 'desktop'
        };
      } catch (error) {
        console.error('Failed to check biometric availability (Tauri):', error);
        return {
          available: false,
          type: 'unknown',
          enrolled: false,
          platform: 'desktop'
        };
      }
    } else if (this.webAuthnSupported) {
      // Web (WebAuthn)
      try {
        // Check if WebAuthn is available and if user has enrolled credentials
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return {
          available,
          type: available ? 'fingerprint' : 'unknown', // WebAuthn can be fingerprint or face
          enrolled: available, // If available, assume enrolled
          platform: 'web'
        };
      } catch (error) {
        console.error('Failed to check WebAuthn availability:', error);
        return {
          available: false,
          type: 'unknown',
          enrolled: false,
          platform: 'web'
        };
      }
    }

    return {
      available: false,
      type: 'unknown',
      enrolled: false,
      platform: 'web'
    };
  }

  /**
   * Authenticate using biometrics with ML enhancements
   */
  async authenticate(
    prompt: string = 'Authenticate to unlock SafeNode'
  ): Promise<BiometricAuthResult> {
    let baseResult: BiometricAuthResult;

    if (this.isTauri && this.tauriApi) {
      // Desktop (Tauri)
      try {
        const { invoke } = this.tauriApi.core;
        const result = await invoke('authenticate_biometric', { prompt });
        baseResult = {
          success: result.success || false,
          error: result.error
        };
      } catch (error: any) {
        baseResult = {
          success: false,
          error: error.message || 'Biometric authentication failed'
        };
      }
    } else if (this.webAuthnSupported) {
      // Web (WebAuthn)
      baseResult = await this.authenticateWithWebAuthn(prompt);
    } else {
      return {
        success: false,
        error: 'Biometric authentication not available on this platform'
      };
    }

    return baseResult;
  }

  /**
   * Authenticate using WebAuthn (for web platform)
   */
  private async authenticateWithWebAuthn(prompt: string): Promise<BiometricAuthResult> {
    try {
      const token = localStorage.getItem('safenode_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Request authentication options from backend
      const optionsResponse = await fetch(`${API_BASE}/api/biometric/authenticate/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get authentication options');
      }

      const options = await optionsResponse.json();

      // Create credential request
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: this.base64UrlToBuffer(options.challenge),
        timeout: options.timeout || 60000,
        rpId: options.rpId || window.location.hostname,
        userVerification: 'required',
        allowCredentials: options.allowCredentials?.map((cred: any) => ({
          type: 'public-key',
          id: this.base64UrlToBuffer(cred.id),
          transports: cred.transports
        }))
      };

      // Request authentication
      const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;

      if (!assertion) {
        return {
          success: false,
          error: 'Authentication cancelled'
        };
      }

      const response = assertion.response as AuthenticatorAssertionResponse;
      const credentialPayload = {
        id: assertion.id,
        rawId: this.bufferToBase64Url(assertion.rawId),
        type: assertion.type,
        response: {
          clientDataJSON: this.bufferToBase64Url(response.clientDataJSON),
          authenticatorData: this.bufferToBase64Url(response.authenticatorData),
          signature: this.bufferToBase64Url(response.signature),
          userHandle: response.userHandle ? this.bufferToBase64Url(response.userHandle) : null
        },
        clientExtensionResults: assertion.getClientExtensionResults?.() || {}
      };

      // Verify with backend
      const verifyResponse = await fetch(`${API_BASE}/api/biometric/authenticate/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(credentialPayload)
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json().catch(() => ({ message: 'Authentication verification failed' }));
        throw new Error(error.message || error.error || 'Authentication verification failed');
      }

      return {
        success: true,
        credential: assertion
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'WebAuthn authentication failed'
      };
    }
  }

  /**
   * Register a new biometric credential (for WebAuthn)
   */
  async register(userId: string, userName: string, displayName: string): Promise<BiometricAuthResult> {
    if (!this.webAuthnSupported) {
      return {
        success: false,
        error: 'WebAuthn not supported on this platform'
      };
    }

    try {
      const token = localStorage.getItem('safenode_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Request registration options from backend
      const optionsResponse = await fetch(`${API_BASE}/api/biometric/register/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, userName, displayName })
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsResponse.json();

      // Create credential
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: this.base64UrlToBuffer(options.challenge),
        rp: {
          name: options.rp.name || 'SafeNode',
          id: options.rp.id || window.location.hostname
        },
        user: {
          id: this.base64UrlToBuffer(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use platform authenticator (biometrics)
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: options.timeout || 60000,
        attestation: 'none'
      };

      // Create credential
      const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;

      if (!credential) {
        return {
          success: false,
          error: 'Registration cancelled'
        };
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialPayload = {
        id: credential.id,
        rawId: this.bufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: this.bufferToBase64Url(response.clientDataJSON),
          attestationObject: this.bufferToBase64Url(response.attestationObject),
          transports: response.getTransports?.() || []
        },
        clientExtensionResults: credential.getClientExtensionResults?.() || {}
      };

      // Verify with backend
      const verifyResponse = await fetch(`${API_BASE}/api/biometric/register/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(credentialPayload)
      });

      if (!verifyResponse.ok) {
        throw new Error('Registration verification failed');
      }

      return {
        success: true,
        credential
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biometric registration failed'
      };
    }
  }

  /**
   * Get platform name for display
   */
  getPlatformName(): string {
    if (this.isTauri) {
      const platform = navigator.platform.toLowerCase();
      if (platform.includes('mac')) return 'Touch ID / Face ID';
      if (platform.includes('win')) return 'Windows Hello';
      if (platform.includes('linux')) return 'Linux Biometric';
      return 'System Biometric';
    }
    if (this.webAuthnSupported) {
      return 'WebAuthn (Windows Hello / Touch ID)';
    }
    return 'Biometric Authentication';
  }

  private mapBiometricType(type: string): BiometricType {
    const lower = type.toLowerCase();
    if (lower.includes('finger') || lower.includes('touch')) return 'fingerprint';
    if (lower.includes('face')) return 'face';
    if (lower.includes('iris')) return 'iris';
    if (lower.includes('voice')) return 'voice';
    return 'unknown';
  }

  private base64UrlToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private bufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

export const biometricAuthService = new BiometricAuthService();
