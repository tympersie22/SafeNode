# Desktop Release Security

Safenode desktop targets Apple Silicon macOS, x64 Windows, and x64 Linux through
Tauri 2. Download links remain disabled unless
`VITE_DESKTOP_DOWNLOAD_ENABLED=true` is explicitly set after every release gate passes.

## Native desktop shell

The desktop build is not a hosted website wrapper. It packages the audited
frontend and Rust host into an offline application bundle with native windows,
application menus, tray integration, platform icons, and installers. Closing the
window locks the in-memory vault and hides the process to the tray. The native
menu exposes a lock action through a single narrow event; no generic filesystem,
shell, secret-store, or cryptographic IPC API is available.

Release targets are explicit:

- macOS: `aarch64-apple-darwin` app and DMG, minimum macOS 12.
- Windows: `x86_64-pc-windows-msvc` NSIS installer.
- Linux: `x86_64-unknown-linux-gnu` AppImage.

## Current trust boundary

The desktop renderer has no filesystem, shell, dialog, keychain, biometric, or
custom vault-command permission. Its only non-core capability is opening URLs
under `https://safe-node.app/*` in the system browser. A strict CSP limits network
access to the Safenode API and error-reporting origin.

This replaces the legacy shell, which contained placeholder biometric handlers,
generic keychain commands, unrestricted filesystem access, and no CSP. Those
interfaces must not be restored. Vault keys, passphrases, recovery material, PRF
outputs, and authentication tokens must never cross a generic desktop IPC bridge.

## Browser-to-app authentication

The bundled Tauri origin is not the `safe-node.app` WebAuthn relying party. Running
a passkey ceremony there would fail with an invalid-domain error or create a
separate credential boundary. The desktop app therefore uses this authorization
handoff:

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
8. Vault keys remain memory-only and vault decryption remains client-side.

Do not place bearer tokens, vault keys, passphrases, recovery secrets, or PRF
outputs in a deep-link URL.

The backend stores only the PKCE challenge and hashes of the state and one-time
authorization code. Set `DESKTOP_AUTH_WEB_ORIGIN=https://safe-node.app` in the
production backend. The custom URI handler is registered by the installed app;
callbacks received without an active matching in-memory request are rejected.

## Threat model: the custom-scheme handoff

Custom URI schemes on desktop are **not exclusive** — any locally installed
application can also register `safenode://` and receive the callback. The handoff
is designed to remain safe even when that happens.

- **PKCE (S256) is the primary defense.** The `code_verifier` is generated in the
  desktop app's memory and never leaves it until the final HTTPS exchange. An
  attacker who intercepts `safenode://auth/callback` obtains only the one-time
  `code` and `state` — **not** the verifier — so the stolen code cannot be
  redeemed. The backend recomputes `SHA-256(code_verifier)` and compares it to the
  stored challenge in constant time.
- **State** binds the callback to the request the app initiated (CSRF / mix-up
  protection) and is verified in constant time.
- **One-time, short-lived codes.** Authorization codes are 256-bit random, expire
  in five minutes, and are consumed atomically; concurrent or repeated exchanges
  fail closed.
- **No redeemable secrets at rest.** The server stores only the PKCE challenge and
  SHA-256 hashes of the state and authorization code.
- **Explicit user approval.** A code is issued only after an authenticated user
  approves the request on the canonical web origin — there is no silent grant.
- **Rate limiting.** The `/api/desktop-auth/*` endpoints are covered by the global
  API rate limiter as defense-in-depth against flow enumeration.

**Residual risk and future hardening.** Because the scheme is not exclusive, a
malicious local app can still *observe* an authorization code (though not redeem
it, without the verifier). This is the accepted trade-off for custom-scheme native
apps under [RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252). To eliminate
scheme-squatting entirely, a future version can move the redirect to a **loopback
interface** (`http://127.0.0.1:<random-port>/callback`, RFC 8252 §7.3), where the
OS guarantees only the process that opened the port receives the response. The
current PKCE + state + single-use design is sufficient for launch.

## Windows Authenticode

Release tags require a trusted code-signing certificate in GitHub Actions:

- `WINDOWS_CERTIFICATE_BASE64`: base64 of the PFX certificate and private key.
- `WINDOWS_CERTIFICATE_PASSWORD`: PFX import password.

The workflow imports the PFX into the ephemeral runner certificate store, injects
its thumbprint into Tauri's Windows configuration, and rejects the release unless
`Get-AuthenticodeSignature` reports `Valid` for the NSIS installer.

## Linux signing

Release tags require:

- `LINUX_GPG_PRIVATE_KEY_BASE64`: base64 of an ASCII-armored GPG private key.
- `LINUX_GPG_PASSPHRASE`: passphrase for that key, or an empty secret for a
  dedicated unencrypted CI signing subkey.

The workflow publishes `Safenode-Linux.AppImage`, its detached armored signature
(`.asc`), its `.sha256` file, and a release-wide `SHA256SUMS`. The release also
publishes a detached armored signature over the manifest itself,
`SHA256SUMS.asc`, signed with the same key so the full checksum list can be
verified before trusting any individual artifact. Publish the corresponding
public key and fingerprint on `safe-node.app` through a separately reviewed
deployment.

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
