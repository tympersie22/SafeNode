# iOS Release Security

Safenode's iOS bundle identifier is `com.safenode.mobile`. The iOS application
uses the same `safe-node.app` WebAuthn relying-party origin as the web and
Android clients. The native WebView must not be changed to a local or arbitrary
hostname because that would create a different passkey security boundary.

## Native identity

- Apple team: `Z8D3PDB7MR`
- Bundle identifier: `com.safenode.mobile`
- Associated-domain app identifier: `Z8D3PDB7MR.com.safenode.mobile`
- Minimum deployment target: iOS 15
- Capacitor serves bundled assets from `https://safe-node.app`

The target enables these associated domains:

- `webcredentials:safe-node.app` for passkey access in `WKWebView`
- `applinks:safe-node.app` for verified links into the application

The matching association document is
`frontend/public/.well-known/apple-app-site-association`. It contains no secret
material and must be deployed without a redirect and with
`Content-Type: application/json`.

## Local simulator build

From `frontend/`:

```bash
npm install
npm run cap:sync:ios
npm run build:ios:simulator
```

The build defaults to `https://api.safe-node.app`. Override both API variables
when intentionally testing another HTTPS deployment:

```bash
VITE_API_URL=https://api.example.com \
VITE_MOBILE_API_URL=https://api.example.com \
npm run build:ios:simulator
```

Do not point a release build at localhost. A physical iPhone cannot reach the
development computer through its own loopback interface, and an alternate
origin will not match the production passkey relying party.

### Local simulator authentication

The native iOS passkey provider uses `safe-node.app` as its relying-party ID, so
a local passkey test must keep that RP ID while reaching the local API through
an HTTPS tunnel:

```bash
cd backend
npm run dev:ios

# In another terminal (ngrok must already be authenticated):
ngrok http 4000

cd ../frontend
VITE_MOBILE_API_URL=https://YOUR-TUNNEL.ngrok-free.app npm run build:ios:simulator:tunnel
```

Do not commit a temporary tunnel URL. The production build must continue to use
`https://api.safe-node.app` and must not be published unless its health endpoint
returns HTTP 200.

The bundled WebView itself uses the custom origin `capacitor://safe-node.app`.
Capacitor cannot register `http` or `https` as an iOS local scheme. Passkey
registration and assertion therefore run through the native
`AuthenticationServices` bridge in `NativePasskeysPlugin.swift`; browser builds
continue to use `navigator.credentials`. The API CORS policy accepts the custom
origin, while WebAuthn verification remains cryptographically bound to RP ID
`safe-node.app`.

## Device and TestFlight requirements

1. Add the Apple account for team `Z8D3PDB7MR` in Xcode.
2. Register `com.safenode.mobile` in Apple Developer and enable Associated
   Domains.
3. Create an Apple Distribution certificate and App Store provisioning profile,
   or allow Xcode automatic signing to manage them.
4. Verify the Cloudflare Pages frontend and Railway API before archiving.
5. Confirm `https://safe-node.app/.well-known/apple-app-site-association` returns
   HTTP 200, JSON content, and the expected app identifier without redirects.
6. Confirm `https://api.safe-node.app/api/health` returns HTTP 200.
7. Archive the Release scheme in Xcode and upload through Organizer to
   TestFlight. Complete Apple's export-compliance questionnaire accurately;
   Safenode uses application-level cryptography.

## Release gate

On a physical iPhone, verify all of the following before enabling an iOS
download or App Store link:

1. Create an account with a passkey.
2. Sign in again using that passkey.
3. Enroll passkey PRF vault unlock after an authenticated fallback unlock.
4. Lock and cryptographically unlock the vault with the passkey.
5. Verify vault-passphrase and recovery-kit fallback paths.
6. Verify device registration, device limits, team vault access, and sync.
7. Confirm no master password, raw vault key, recovery secret, or PRF output is
   present in WebKit local storage, session storage, IndexedDB, logs, or crash
   reports.
8. Verify the universal-link and associated-domain diagnostics on the signed
   build.

The App Store download must remain disabled until this device checklist passes.
