# SafeNode Mobile

React Native (Expo) client for SafeNode. Shares crypto & type modules with the web app to keep vault behaviour consistent across platforms.

## Requirements

- Node 18+
- `expo` CLI (`npm install -g expo-cli`)

## Setup

```bash
cd mobile
npm install
npm run start
```

Metro is configured to watch the workspace root so changes to shared frontend modules are available in the mobile app.

## Architecture Overview

- `src/App.tsx` – navigation shell.
- `src/screens/*` – onboarding, unlock, vault list.
- `src/hooks/useVault.ts` – orchestrates vault sync, biometric unlock (expo-local-authentication), offline cache & pending queue (AsyncStorage + SecureStore).
- `src/hooks/usePasskeys.ts` – stages passkey registration/authentication with backend until RN WebAuthn arrives.
- `src/components/VaultList.tsx` – renders entries with nativewind styling.
- Shared crypto, types imported from `../frontend/src`.

## Next Steps

- Elevate queue processing to encrypt/edit entries directly from mobile (write flows).
- Promote staged passkeys once React Native WebAuthn becomes available.
- Ship push notifications for Watchtower alerts on mobile.
- Integrate React Query mutations with existing backend endpoints for entry CRUD.

