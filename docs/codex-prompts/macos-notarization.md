# Codex task: macOS Developer ID signing + notarization, and GPG-signed SHA256SUMS

## Context

`.github/workflows/release.yml` already signs Windows (Authenticode, fail-closed
with thumbprint verification) and Linux (detached GPG `.asc`, fail-closed with
`gpg --verify`). Two gaps remain and this task closes both:

1. **macOS is unsigned and un-notarized.** The `.dmg` ships without a Developer
   ID signature or an Apple notarization ticket, so Gatekeeper shows the
   "unidentified developer / cannot be opened" warning and users must
   right-click → Open. The download page currently labels macOS "unsigned beta"
   because of this — that label should become removable once this lands.
2. **`SHA256SUMS` is not itself signed.** The manifest lists checksums but has no
   detached signature, so a tamper of the release page could swap both the
   artifact and its checksum. Add a detached GPG signature over `SHA256SUMS`.

Do not change any other signing logic, the artifact names
(`Safenode-macOS.dmg`, `Safenode-Windows.exe`, `Safenode-Linux.AppImage`,
`Safenode-Android.apk`, `safenode-extension-*.zip`), the deep-link / desktop-auth
crypto, the `safe-node.app` domain, or the WebAuthn RP ID.

## Required GitHub Actions secrets (add to the repo; do not hardcode)

- `APPLE_CERTIFICATE` — base64 of the Developer ID Application `.p12`.
- `APPLE_CERTIFICATE_PASSWORD` — password for that `.p12`.
- `APPLE_SIGNING_IDENTITY` — e.g. `Developer ID Application: Your Name (TEAMID)`.
- `APPLE_ID` — Apple ID email used for notarization.
- `APPLE_PASSWORD` — an app-specific password for that Apple ID (not the login password).
- `APPLE_TEAM_ID` — the 10-character Apple Developer Team ID.

The Linux GPG secrets already exist and are reused for the SHA256SUMS signature:
`LINUX_GPG_PRIVATE_KEY_BASE64`, `LINUX_GPG_PASSPHRASE`.

## Change 1 — sign + notarize macOS in `build-desktop` (the `macos` matrix leg)

Tauri v2's macOS bundler codesigns and notarizes automatically when the Apple
env vars are present, but this pipeline must **fail closed** and **independently
verify**, matching the Windows/Linux pattern. Implement it explicitly:

1. Add the six `APPLE_*` values to the job `env:` block (alongside the existing
   `WINDOWS_*` / `LINUX_*` entries) so they are available to the macOS build.

2. **Before** the "Build desktop app" step, add a macOS-only step
   (`if: matrix.platform == 'macos'`) that fails closed if any `APPLE_*` secret
   is empty, then imports the Developer ID certificate into a dedicated,
   ephemeral keychain (do not touch the login keychain):

   ```bash
   set -euo pipefail
   for v in APPLE_CERTIFICATE APPLE_CERTIFICATE_PASSWORD APPLE_SIGNING_IDENTITY \
            APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID; do
     if [ -z "${!v:-}" ]; then echo "$v is required for macOS release builds" >&2; exit 1; fi
   done
   KEYCHAIN="$RUNNER_TEMP/safenode-signing.keychain-db"
   KEYCHAIN_PW="$(openssl rand -base64 24)"
   security create-keychain -p "$KEYCHAIN_PW" "$KEYCHAIN"
   security set-keychain-settings -lut 21600 "$KEYCHAIN"
   security unlock-keychain -p "$KEYCHAIN_PW" "$KEYCHAIN"
   CERT_FILE="$RUNNER_TEMP/developer-id.p12"
   printf '%s' "$APPLE_CERTIFICATE" | base64 --decode > "$CERT_FILE"
   security import "$CERT_FILE" -k "$KEYCHAIN" -P "$APPLE_CERTIFICATE_PASSWORD" \
     -T /usr/bin/codesign -T /usr/bin/security
   security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PW" "$KEYCHAIN"
   # Make the ephemeral keychain searchable while keeping the login keychain.
   security list-keychains -d user -s "$KEYCHAIN" "$(security list-keychains -d user | tr -d '"')"
   rm -f "$CERT_FILE"
   ```

3. Let Tauri sign and notarize during the existing "Build desktop app" step by
   passing the Apple env through to it (Tauri reads `APPLE_SIGNING_IDENTITY`,
   `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` and will codesign the `.app`,
   submit the `.dmg` to `notarytool`, and staple it). Keep the command
   `npm run tauri:build -- --target ${{ matrix.target }} --bundles ${{ matrix.bundle }}`.
   Ensure `src-tauri/tauri.conf.json` (or `tauri.macos.conf.json`) has
   `bundle.macOS.signingIdentity` sourced from `APPLE_SIGNING_IDENTITY` and
   hardened runtime enabled; add a minimal entitlements file if notarization
   requires it. If Tauri's built-in notarization is not used, instead run
   explicitly after the build: `xcrun notarytool submit <dmg> --apple-id
   "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait`
   then `xcrun stapler staple <dmg>`.

4. **After** the build, add a macOS-only verification step that fails the release
   unless the DMG is signed, notarized, and stapled:

   ```bash
   set -euo pipefail
   DMG="$(find src-tauri/target/aarch64-apple-darwin/release/bundle/dmg -name '*.dmg' | head -n1)"
   test -n "$DMG"
   # App bundle codesign is valid and from the expected identity.
   APP="$(find src-tauri/target/aarch64-apple-darwin/release/bundle/macos -maxdepth 1 -name '*.app' | head -n1)"
   codesign --verify --deep --strict --verbose=2 "$APP"
   codesign -dv --verbose=4 "$APP" 2>&1 | grep -q "$APPLE_TEAM_ID"
   # Notarization ticket is stapled to the DMG.
   xcrun stapler validate "$DMG"
   # Gatekeeper accepts it for opening (no unidentified-developer prompt).
   spctl --assess --type open --context context:primary-signature --verbose=4 "$DMG"
   ```

5. Delete the ephemeral keychain in the existing "Remove temporary signing
   material" step (add `security delete-keychain "$RUNNER_TEMP/safenode-signing.keychain-db" || true`
   guarded by `if: always()` and `matrix.platform == 'macos'`).

## Change 2 — GPG-sign SHA256SUMS in the assembly job

In the assembly job (`needs: build-desktop, build-android-apk, package-extensions`),
the `APPLE_*` secrets are not needed, but the Linux GPG key is. After the line
that generates `SHA256SUMS`, import the GPG key (same base64/passphrase pattern
as the Linux signing step) and produce a detached armored signature, failing
closed and verifying it:

```bash
set -euo pipefail
test -n "${LINUX_GPG_PRIVATE_KEY_BASE64}" || { echo "GPG key required to sign SHA256SUMS" >&2; exit 1; }
KEY_FILE="${RUNNER_TEMP}/safenode-sums-signing.asc"
printf '%s' "${LINUX_GPG_PRIVATE_KEY_BASE64}" | base64 --decode > "${KEY_FILE}"
chmod 600 "${KEY_FILE}"
gpg --batch --import "${KEY_FILE}"
FPR="$(gpg --batch --with-colons --list-secret-keys | awk -F: '$1=="fpr"{print $10; exit}')"
test -n "${FPR}"
gpg --batch --yes --pinentry-mode loopback --passphrase "${LINUX_GPG_PASSPHRASE}" \
  --local-user "${FPR}" --armor --detach-sign release-assets/SHA256SUMS
gpg --batch --verify release-assets/SHA256SUMS.asc release-assets/SHA256SUMS
rm -f "${KEY_FILE}"
```

Add `LINUX_GPG_PRIVATE_KEY_BASE64` and `LINUX_GPG_PASSPHRASE` to the assembly
job's `env:` (or step `env:`). `release-assets/SHA256SUMS.asc` is uploaded
automatically by the existing `files: release-assets/*` glob.

## Change 3 — docs + download page follow-up (small)

- In `docs/desktop-release.md`, the macOS release-gate bullet already says
  "Developer ID signing and Apple notarization pass" — leave it, it now matches
  reality. Add one line under "Linux signing" noting the release also publishes
  `SHA256SUMS` **and** its detached `SHA256SUMS.asc`.
- In `frontend/src/pages/marketing/Downloads.tsx`, once a signed+notarized macOS
  build has actually shipped, change the macOS `size` label from
  `'Apple Silicon DMG · unsigned beta'` to `'Signed & notarized DMG'`. Leave it
  as the honest "unsigned beta" until the first notarized release is verified.

## Acceptance criteria

- Release fails closed on macOS if any `APPLE_*` secret is missing.
- The published `Safenode-macOS.dmg` passes `codesign --verify --deep --strict`,
  `xcrun stapler validate`, and `spctl --assess --type open` — i.e. opens with no
  Gatekeeper warning on a clean machine.
- `SHA256SUMS.asc` is present in the release and verifies against `SHA256SUMS`
  with the published Safenode public key.
- No secret is written to logs; all temp key/cert material is removed on
  `always()`; Windows and Linux signing behavior is unchanged.
