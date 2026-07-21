/**
 * Biometric Authentication Module
 * Cross-platform biometric authentication abstraction
 */

use serde_json::Value;

/// Biometric authentication result
#[derive(Debug, Clone)]
pub struct BiometricResult {
    pub success: bool,
    pub error: Option<String>,
    pub method: Option<String>,
}

/// Trait for platform-specific biometric authentication
pub trait BiometricAuthenticator {
    /// Check if biometric authentication is available
    fn is_available(&self) -> Result<BiometricAvailability, String>;
    
    /// Authenticate using biometrics
    fn authenticate(&self, prompt: &str) -> Result<BiometricResult, String>;
}

/// Biometric availability information
#[derive(Debug, Clone)]
pub struct BiometricAvailability {
    pub available: bool,
    pub biometric_type: BiometricType,
    pub enrolled: bool,
}

/// Types of biometric authentication
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BiometricType {
    Fingerprint,
    Face,
    Unknown,
}

/// Platform-specific biometric authenticator implementations

#[cfg(target_os = "macos")]
pub mod macos {
    use super::*;
    
    pub struct MacOSBiometricAuthenticator;
    
    impl super::BiometricAuthenticator for MacOSBiometricAuthenticator {
        fn is_available(&self) -> Result<BiometricAvailability, String> {
            // macOS: Check for LocalAuthentication framework availability
            // In production, this would use Objective-C bindings or a crate like `localauth`
            // For now, return a placeholder that indicates availability
            
            Ok(BiometricAvailability {
                available: true,
                biometric_type: BiometricType::Fingerprint, // Could be Face for Face ID
                enrolled: true,
            })
        }
        
        fn authenticate(&self, prompt: &str) -> Result<BiometricResult, String> {
            // macOS: Use LocalAuthentication framework
            // In production, this would:
            // 1. Create an LAContext
            // 2. Evaluate policy with LAPolicy.deviceOwnerAuthenticationWithBiometrics
            // 3. Handle success/failure callbacks
            
            // Placeholder implementation
            Ok(BiometricResult {
                success: true,
                error: None,
                method: Some("Touch ID or Face ID".to_string()),
            })
        }
    }
}

#[cfg(target_os = "windows")]
pub mod windows {
    use super::*;
    
    pub struct WindowsBiometricAuthenticator;
    
    impl super::BiometricAuthenticator for WindowsBiometricAuthenticator {
        fn is_available(&self) -> Result<BiometricAvailability, String> {
            // Windows: Check for Windows Hello availability
            // In production, this would use Windows.Security.Credentials.UI APIs
            // via the `windows` crate
            
            Ok(BiometricAvailability {
                available: true,
                biometric_type: BiometricType::Fingerprint, // Could be Face for Windows Hello Face
                enrolled: true,
            })
        }
        
        fn authenticate(&self, prompt: &str) -> Result<BiometricResult, String> {
            // Windows: Use Windows Hello APIs
            // In production, this would:
            // 1. Use UserConsentVerifier.RequestVerificationAsync
            // 2. Handle the verification result
            
            // Placeholder implementation
            Ok(BiometricResult {
                success: true,
                error: None,
                method: Some("Windows Hello".to_string()),
            })
        }
    }
}

#[cfg(target_os = "linux")]
pub mod linux {
    use super::*;
    
    pub struct LinuxBiometricAuthenticator;
    
    impl super::BiometricAuthenticator for LinuxBiometricAuthenticator {
        fn is_available(&self) -> Result<BiometricAvailability, String> {
            // Linux: Check for fprintd availability via D-Bus
            // In production, this would use zbus to query fprintd service
            
            Ok(BiometricAvailability {
                available: false,
                biometric_type: BiometricType::Unknown,
                enrolled: false,
            })
        }
        
        fn authenticate(&self, prompt: &str) -> Result<BiometricResult, String> {
            // Linux: Use fprintd via D-Bus
            // In production, this would:
            // 1. Connect to fprintd D-Bus service
            // 2. Call VerifyStart and VerifyStop methods
            // 3. Handle verification result
            
            Err("Biometric authentication requires fprintd. Install fprintd to enable fingerprint authentication.".to_string())
        }
    }
}

/// Get platform-specific biometric authenticator
pub fn get_biometric_authenticator() -> Box<dyn BiometricAuthenticator> {
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacOSBiometricAuthenticator)
    }
    
    #[cfg(target_os = "windows")]
    {
        Box::new(windows::WindowsBiometricAuthenticator)
    }
    
    #[cfg(target_os = "linux")]
    {
        Box::new(linux::LinuxBiometricAuthenticator)
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        // Fallback for unsupported platforms
        struct UnsupportedBiometricAuthenticator;
        impl BiometricAuthenticator for UnsupportedBiometricAuthenticator {
            fn is_available(&self) -> Result<BiometricAvailability, String> {
                Ok(BiometricAvailability {
                    available: false,
                    biometric_type: BiometricType::Unknown,
                    enrolled: false,
                })
            }
            
            fn authenticate(&self, _prompt: &str) -> Result<BiometricResult, String> {
                Err("Biometric authentication not available on this platform".to_string())
            }
        }
        Box::new(UnsupportedBiometricAuthenticator)
    }
}

/// Check biometric availability (for Tauri command)
pub fn check_biometric_available() -> Result<Value, String> {
    let authenticator = get_biometric_authenticator();
    let availability = authenticator.is_available()?;
    
    Ok(serde_json::json!({
        "available": availability.available,
        "type": match availability.biometric_type {
            BiometricType::Fingerprint => "fingerprint",
            BiometricType::Face => "face",
            BiometricType::Unknown => "unknown",
        },
        "enrolled": availability.enrolled
    }))
}

/// Authenticate with biometrics (for Tauri command)
pub fn authenticate_biometric(prompt: &str) -> Result<Value, String> {
    let authenticator = get_biometric_authenticator();
    let result = authenticator.authenticate(prompt)?;
    
    if result.success {
        Ok(serde_json::json!({
            "success": true,
            "method": result.method,
            "prompt": prompt
        }))
    } else {
        Ok(serde_json::json!({
            "success": false,
            "error": result.error.unwrap_or_else(|| "Authentication failed".to_string()),
            "prompt": prompt
        }))
    }
}

