# Desktop Release Security

Safenode desktop targets macOS, Windows, and Linux through Tauri 2. The current
desktop package is a security preview, not a production release. Download links
remain disabled unless `VITE_DESKTOP_DOWNLOAD_ENABLED=true` is explicitly set.

## Current trust boundary

The desktop renderer has no filesystem, shell, dialog, keychain, biometric, or
custom vault-command permission. Its only non-core capability is opening URLs
under `https://safe-node.app/*` in the system browser. A strict CSP limits network
access to the Safenode API and error-reporting origin.

This replaces the legacy shell, which contained placeholder biometric handlers,
generic keychain commands, unrestricted filesystem access, and no CSP. Those
interfaces must not be restored. Vault keys, passphrases, recovery material, PRF
outputs, and authentication tokens must never cross a generic desktop IPC bridge.

## Why passkey login opens the browser

The bundled Tauri origin is not the `safe-node.app` WebAuthn relying party. Running
a passkey ceremony there would fail with an invalid-domain error or create a
separate credential boundary. The preview therefore opens the canonical website
and does not imply that browser authentication has signed the desktop app in.

## Production handoff required

Before desktop downloads can be enabled, implement a browser-to-app authorization
handoff with these properties:

1. The app generates a high-entropy state value and PKCE verifier in memory.
2. The system browser opens `https://safe-node.app` with the state and PKCE
   challenge.
3. Passkey authentication happens only on the canonical web origin.
4. The backend issues a short-lived, single-use authorization code bound to the
   state, PKCE challenge, user, and requesting device.
5. A registered `safenode://` deep link returns only that code to the signed app.
6. The app validates the state and exchanges the code plus verifier over HTTPS.
7. The backend atomically consumes the code; replay, expiry, mismatch, and reuse
   all fail closed.
8. The app stores only a scoped session credential in the operating-system secure
   store. Vault keys remain memory-only and vault decryption remains client-side.

Do not place bearer tokens, vault keys, passphrases, recovery secrets, or PRF
outputs in a deep-link URL.

## Local build

```bash
npm ci
npm ci --prefix frontend
npm run tauri:icons
VITE_API_URL=https://api.safe-node.app npm run tauri:build
```

Artifacts are written under `src-tauri/target/release/bundle/`.

## Release gate

- macOS: Developer ID signing and Apple notarization pass.
- Windows: Authenticode signing and timestamp verification pass.
- Linux: AppImage/package signatures and checksums are published.
- The browser handoff passes state, PKCE, expiry, replay, cancellation, and
  multi-instance tests on all three platforms.
- Passkey login, PRF vault unlock, recovery fallback, device limits, team vaults,
  auto-lock, and clipboard clearing pass on real devices.
- The renderer has no broad capabilities and the production CSP remains enabled.
- `VITE_DESKTOP_DOWNLOAD_ENABLED=true` is set only after all signed artifacts are
  attached to the intended release and independently verified.
