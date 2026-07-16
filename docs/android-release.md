# Android Release Security

Safenode's Android package is `com.safenode.mobile`. Release APKs must be signed
with the stable Safenode release certificate and must never be published from a
debug signing configuration.

## Required GitHub configuration

The release workflow requires these Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

It also requires these Actions variables:

- `ANDROID_CERT_SHA256`
- `MOBILE_API_URL`, set to an HTTPS API origin without a trailing slash

The public certificate fingerprint must appear in
`frontend/public/.well-known/assetlinks.json`. The Android build receives the API
origin as both `VITE_API_URL` and `VITE_MOBILE_API_URL`; CI rejects an absent,
non-HTTPS, or trailing-slash value so the app never falls back to a local Vite proxy.

The keystore itself is not stored in Git. Keep an encrypted offline backup. Losing
it prevents Safenode from shipping in-place updates under the same Android package.

## Release gate

1. Restore `safe-node.app` and deploy the current frontend.
2. Confirm `https://safe-node.app/.well-known/assetlinks.json` returns HTTP 200 with
   `Content-Type: application/json` and no redirects.
3. Tag a release. GitHub Actions builds `assembleRelease`, verifies the APK signer,
   and verifies that the certificate is present in the Digital Asset Links file.
4. Install the release APK on Android 9 or newer and complete passkey registration,
   passkey sign-in, vault unlock, and recovery fallback.
5. Set `VITE_ANDROID_DOWNLOAD_ENABLED=true` in the frontend deployment only after
   those checks pass.

The older EAS preview APK used a different signer. It cannot update in place to the
Capacitor release and should be treated as a retired preview build.
