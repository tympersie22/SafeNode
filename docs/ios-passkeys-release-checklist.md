# iOS release checklist — RESTORE PASSKEYS BEFORE SHIPPING

⚠️ The current iOS build has **Associated Domains stripped** so it can run on a
free Apple Personal Team. In this state, **passkeys do not work** — iOS returns
`ASAuthorizationError Code=1004 "Application ... is not associated with domain
safe-node.app"`. This is expected, not a bug. Do NOT ship this configuration.

## What was temporarily removed

`frontend/ios/App/App/App.entitlements` — the `com.apple.developer.associated-domains`
key (with `webcredentials:safe-node.app` and `applinks:safe-node.app`) was
removed. The exact block to restore is preserved as a comment inside that file.

## To restore full passkey support (requires paid Apple Developer Program)

1. Enroll in the Apple Developer Program ($99/yr) and select the **paid team**
   in Xcode → target **App** → Signing & Capabilities. Note the 10-char Team ID.
2. Restore the entitlement in `frontend/ios/App/App/App.entitlements`:

   ```xml
   <key>com.apple.developer.associated-domains</key>
   <array>
       <string>webcredentials:safe-node.app</string>
       <string>applinks:safe-node.app</string>
   </array>
   ```

3. In Xcode → Signing & Capabilities, add the **Associated Domains** capability
   back (it will now be allowed on the paid team).
4. Host the Apple App Site Association file at
   `https://safe-node.app/.well-known/apple-app-site-association`
   — served as `application/json`, over HTTPS, **no redirects**, containing the
   real Team ID:

   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         { "appID": "TEAMID.com.safenode.mobile", "paths": ["*"] }
       ]
     },
     "webcredentials": {
       "apps": ["TEAMID.com.safenode.mobile"]
     }
   }
   ```

   Replace `TEAMID` with the paid team's ID. (The backend WebAuthn RP ID must
   stay `safe-node.app` — do not change it.)
5. Rebuild. Passkey register/sign-in should succeed (no Code=1004).

## Notes

- The free Personal Team dev build also **expires after 7 days** — re-run from
  Xcode to refresh.
- Android's equivalent (`assetlinks.json`) is already present under
  `frontend/public/.well-known/` and `frontend/ios/App/App/public/.well-known/`.
