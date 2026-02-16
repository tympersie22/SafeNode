# 📱 SafeNode Mobile App - Implementation Prompt

**Use this prompt to guide development of SafeNode mobile apps**

---

## 🎯 Project Brief

Build native Android and iOS mobile applications for SafeNode password manager using React Native + Expo. The apps must maintain zero-knowledge encryption while providing seamless biometric authentication and offline-first functionality.

---

## 📋 Complete Implementation Prompt

```
I need to build Android and iOS mobile apps for SafeNode, a zero-knowledge password manager.

CURRENT STACK:
- Backend: Fastify + TypeScript + PostgreSQL (deployed on Vercel)
- Frontend: React + Vite + TypeScript (deployed on Vercel)
- Database: Supabase PostgreSQL
- Authentication: JWT + Argon2id password hashing
- Encryption: AES-256-GCM for vault data
- API Base: https://backend-phi-bay.vercel.app

REQUIREMENTS:

1. TECHNOLOGY STACK:
   - Use React Native with Expo (not bare React Native)
   - TypeScript for type safety
   - React Navigation for routing
   - Expo Secure Store for encrypted local storage
   - Expo Local Authentication for biometrics
   - SQLite for offline vault storage

2. CORE FEATURES (MVP):
   - User registration and login
   - Biometric authentication (Face ID, Touch ID, Fingerprint)
   - Master password setup and verification
   - Vault creation and management
   - Password entry CRUD operations
   - Password generator with customization
   - Copy to clipboard functionality
   - Search and filter passwords
   - Offline-first with local encrypted storage
   - Real-time sync with backend when online

3. SECURITY REQUIREMENTS:
   - Zero-knowledge architecture (backend never sees plaintext)
   - AES-256-GCM encryption for all vault data
   - Master password never stored (only derived keys)
   - Biometric unlock stores encrypted master password
   - Secure enclave (iOS) / Keystore (Android) for key storage
   - SSL pinning for API requests
   - No cleartext data in memory dumps
   - Auto-lock after inactivity

4. CODE REUSE:
   - Reuse these services from web app:
     * authService.ts (JWT authentication)
     * cryptoService.ts (AES-256-GCM encryption)
     * apiClient.ts (HTTP requests)
   - Create mobile-specific versions of:
     * Storage (SecureStore instead of localStorage)
     * Biometric auth (expo-local-authentication)
     * Navigation (React Navigation)

5. UI/UX REQUIREMENTS:
   - Match existing indigo color scheme from web app:
     * Primary: indigo-600 (#4F46E5)
     * Text: gray-900, gray-600, gray-500
     * Backgrounds: white, gray-50
   - Native feel (iOS and Android design patterns)
   - Smooth animations and transitions
   - Dark mode support (iOS/Android system setting)
   - Accessibility (screen readers, dynamic type)

6. PROJECT STRUCTURE:
   SafeNode/
   ├── mobile/                    # React Native app
   │   ├── src/
   │   │   ├── components/       # Reusable UI components
   │   │   ├── screens/          # Screen components
   │   │   ├── navigation/       # Navigation config
   │   │   ├── services/         # Business logic
   │   │   ├── hooks/            # Custom hooks
   │   │   ├── utils/            # Utilities
   │   │   └── types/            # TypeScript types
   │   ├── android/              # Android native code
   │   ├── ios/                  # iOS native code
   │   └── app.json              # Expo config

7. SCREENS TO BUILD:
   Authentication Flow:
   - Splash screen
   - Welcome/Onboarding
   - Login
   - Register
   - Master Password Setup
   - Biometric Setup

   Main App:
   - Vault List
   - Vault Detail (password list)
   - Add/Edit Password Entry
   - Password Generator
   - Settings
   - Profile

8. KEY LIBRARIES:
   {
     "expo": "~50.0.0",
     "react": "18.2.0",
     "react-native": "0.73.0",
     "@react-navigation/native": "^6.1.0",
     "@react-navigation/stack": "^6.3.0",
     "expo-local-authentication": "^13.0.0",
     "expo-secure-store": "^12.0.0",
     "expo-crypto": "^12.0.0",
     "expo-clipboard": "^5.0.0",
     "expo-sqlite": "^13.0.0"
   }

9. DEVELOPMENT PHASES:
   Phase 1 (Week 1-2): Setup & Auth
   - Initialize Expo project
   - Set up navigation
   - Build auth screens
   - Implement biometric auth
   - Connect to backend API

   Phase 2 (Week 3-4): Core Features
   - Build vault screens
   - Implement CRUD operations
   - Add password generator
   - Set up offline storage

   Phase 3 (Week 5-6): Sync & Polish
   - Implement sync service
   - Add search/filter
   - UI polish and animations
   - Error handling

   Phase 4 (Week 7-8): Testing & Launch
   - Security audit
   - Performance optimization
   - Beta testing
   - App Store submission

10. SPECIFIC TASKS:
    [ ] Initialize Expo project with TypeScript template
    [ ] Set up folder structure
    [ ] Configure React Navigation
    [ ] Create shared services folder
    [ ] Port cryptoService from web app
    [ ] Port authService from web app
    [ ] Build authentication UI
    [ ] Implement biometric authentication
    [ ] Set up Secure Store
    [ ] Create vault list UI
    [ ] Implement password CRUD
    [ ] Build password generator
    [ ] Add offline SQLite storage
    [ ] Implement sync service
    [ ] Add search functionality
    [ ] Polish UI/UX
    [ ] Add error boundaries
    [ ] Implement crash reporting
    [ ] Test on iOS
    [ ] Test on Android
    [ ] Security audit
    [ ] Prepare App Store assets
    [ ] Submit to App Store
    [ ] Submit to Google Play

11. API ENDPOINTS TO USE:
    POST /api/auth/register - Create account
    POST /api/auth/login - Login
    GET /api/user/profile - Get user data
    GET /api/sync/detect-conflicts - Check for conflicts
    POST /api/sync/push - Push local changes
    POST /api/sync/pull - Pull remote changes

12. ENCRYPTION FLOW:
    Registration:
    1. User enters email + password
    2. Derive encryption key: Argon2id(password, salt)
    3. Generate master key (random 256 bits)
    4. Encrypt master key with encryption key
    5. Store encrypted master key on server
    6. Store encryption key in Secure Store (biometric protected)

    Vault Encryption:
    1. User creates password entry
    2. Encrypt entry with master key using AES-256-GCM
    3. Store encrypted entry locally (SQLite)
    4. Sync to server when online

    Biometric Unlock:
    1. User enables biometrics
    2. Authenticate with biometrics
    3. Retrieve encryption key from Secure Store
    4. Unlock vault

13. TESTING REQUIREMENTS:
    - Unit tests for crypto functions
    - Integration tests for sync
    - E2E tests for critical flows
    - Security penetration testing
    - Performance testing
    - Battery usage testing

14. PERFORMANCE TARGETS:
    - App launch: < 2 seconds
    - Vault unlock: < 1 second
    - Search: < 100ms response
    - APK/IPA size: < 40 MB
    - Memory: < 100 MB

15. DELIVERABLES:
    - iOS app (TestFlight ready)
    - Android app (Google Play ready)
    - Source code repository
    - Documentation
    - Test coverage report
    - Security audit report

CONSTRAINTS:
- Must work offline (offline-first)
- Must maintain zero-knowledge (server never sees plaintext)
- Must support iOS 14+ and Android 8+
- Must pass App Store review
- Must be production-ready

EXISTING RESOURCES:
- Backend API: https://backend-phi-bay.vercel.app
- Web frontend: https://frontend-pi-nine-39.vercel.app
- GitHub: https://github.com/tympersie22/SafeNode
- Documentation: Available in repo

START WITH:
1. Initialize Expo project
2. Set up folder structure
3. Create navigation skeleton
4. Build auth screens
5. Test login with existing backend

Please help me build this step by step, starting with project initialization.
```

---

## 🚀 Quick Start Commands

Use these commands to start the project:

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Create new Expo project
cd SafeNode
npx create-expo-app mobile --template expo-template-blank-typescript

# Navigate to mobile folder
cd mobile

# Install core dependencies
npm install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context

# Install security dependencies
npx expo install expo-local-authentication expo-secure-store expo-crypto

# Install utilities
npx expo install expo-clipboard expo-sqlite

# Start development server
npx expo start

# Run on iOS (requires Xcode)
npx expo run:ios

# Run on Android (requires Android Studio)
npx expo run:android
```

---

## 📱 Example Screen Implementation

### **Login Screen:**
```typescript
// mobile/src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { authService } from '../services/authService';
import { biometricService } from '../services/biometricService';

export const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await authService.login({ email, password });
      // Navigate to vault
      navigation.replace('Vault');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert('Biometrics not available');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login with biometrics',
    });

    if (result.success) {
      // Retrieve stored credentials and login
      await biometricService.unlockVault();
      navigation.replace('Vault');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleBiometricLogin}>
        <Text style={styles.biometricText}>Use Face ID / Fingerprint</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  biometricText: {
    color: '#4F46E5',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
});
```

---

## 🔐 Example Crypto Service

```typescript
// mobile/src/services/cryptoService.ts
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export class CryptoService {
  // Derive encryption key from password
  async deriveKey(password: string, salt: string): Promise<string> {
    const key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt
    );
    return key;
  }

  // Encrypt data with AES-256-GCM
  async encrypt(data: string, key: string): Promise<string> {
    // Use expo-crypto or web crypto API
    // Implement AES-256-GCM encryption
    // Return base64 encoded ciphertext
  }

  // Decrypt data
  async decrypt(ciphertext: string, key: string): Promise<string> {
    // Implement AES-256-GCM decryption
    // Return plaintext
  }

  // Store encryption key securely
  async storeKey(key: string): Promise<void> {
    await SecureStore.setItemAsync('encryption_key', key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  // Retrieve encryption key
  async getKey(): Promise<string | null> {
    return await SecureStore.getItemAsync('encryption_key');
  }
}

export const cryptoService = new CryptoService();
```

---

## 📊 Progress Tracking

Use this checklist to track implementation progress:

### **Week 1-2: Setup & Foundation**
- [ ] Initialize Expo project
- [ ] Set up TypeScript
- [ ] Configure React Navigation
- [ ] Create folder structure
- [ ] Set up ESLint + Prettier
- [ ] Build Welcome screen
- [ ] Build Login screen
- [ ] Build Register screen
- [ ] Implement biometric auth
- [ ] Test on iOS simulator
- [ ] Test on Android emulator

### **Week 3-4: Core Features**
- [ ] Master password setup screen
- [ ] Vault list screen
- [ ] Password entry list
- [ ] Add/Edit entry screen
- [ ] Password generator
- [ ] Copy to clipboard
- [ ] SQLite offline storage
- [ ] Encryption implementation

### **Week 5-6: Sync & Polish**
- [ ] Sync service
- [ ] Conflict resolution
- [ ] Search functionality
- [ ] Filter functionality
- [ ] Loading states
- [ ] Error boundaries
- [ ] Dark mode
- [ ] Animations

### **Week 7-8: Testing & Launch**
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security audit
- [ ] Performance testing
- [ ] App Store screenshots
- [ ] App Store submission
- [ ] Google Play submission

---

## 🎯 Success Criteria

The mobile apps are complete when:

1. ✅ User can register and login
2. ✅ Biometric authentication works on both platforms
3. ✅ Passwords can be created, read, updated, deleted
4. ✅ Password generator works
5. ✅ Offline access works without internet
6. ✅ Sync works when back online
7. ✅ No security vulnerabilities found
8. ✅ Apps approved by App Store and Google Play
9. ✅ Crash rate < 1%
10. ✅ 4+ star average rating in beta

---

**Ready to start building? Use the prompt above to begin! 🚀**
