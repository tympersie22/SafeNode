import AuthenticationServices
import Capacitor

@objc(NativePasskeysPlugin)
final class NativePasskeysPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "NativePasskeysPlugin"
    let jsName = "NativePasskeys"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private enum Operation {
        case registration
        case authentication
    }

    private var pendingCall: CAPPluginCall?
    private var pendingOperation: Operation?

    @objc func register(_ call: CAPPluginCall) {
        guard let options = call.getObject("options"),
              let rp = options["rp"] as? JSObject,
              let user = options["user"] as? JSObject,
              let rpId = rp["id"] as? String,
              let userName = user["name"] as? String,
              let challenge = decodeBase64URL(options["challenge"] as? String),
              let userId = decodeBase64URL(user["id"] as? String) else {
            call.reject("Invalid passkey registration options")
            return
        }

        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
        let request = provider.createCredentialRegistrationRequest(
            challenge: challenge,
            name: userName,
            userID: userId
        )
        request.userVerificationPreference = .required
        perform(request: request, call: call, operation: .registration)
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        guard let options = call.getObject("options"),
              let rpId = options["rpId"] as? String,
              let challenge = decodeBase64URL(options["challenge"] as? String) else {
            call.reject("Invalid passkey authentication options")
            return
        }

        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
        let request = provider.createCredentialAssertionRequest(challenge: challenge)
        request.userVerificationPreference = .required

        if let credentials = options["allowCredentials"] as? [JSObject] {
            request.allowedCredentials = credentials.compactMap { item in
                guard let credentialId = decodeBase64URL(item["id"] as? String) else { return nil }
                return ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: credentialId)
            }
        }

        perform(request: request, call: call, operation: .authentication)
    }

    private func perform(request: ASAuthorizationRequest, call: CAPPluginCall, operation: Operation) {
        DispatchQueue.main.async {
            self.pendingCall = call
            self.pendingOperation = operation
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    private func decodeBase64URL(_ value: String?) -> Data? {
        guard var value else { return nil }
        value = value.replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        value += String(repeating: "=", count: (4 - value.count % 4) % 4)
        return Data(base64Encoded: value)
    }

    private func encodeBase64URL(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private func finish() {
        pendingCall = nil
        pendingOperation = nil
    }
}

extension NativePasskeysPlugin: ASAuthorizationControllerDelegate {
    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let call = pendingCall else { return }

        switch (pendingOperation, authorization.credential) {
        case (.registration, let credential as ASAuthorizationPlatformPublicKeyCredentialRegistration):
            guard let attestationObject = credential.rawAttestationObject else {
                call.reject("The authenticator did not return attestation data")
                finish()
                return
            }
            let credentialId = encodeBase64URL(credential.credentialID)
            call.resolve([
                "payload": [
                    "credential": [
                        "id": credentialId,
                        "rawId": credentialId,
                        "type": "public-key",
                        "transports": ["internal"]
                    ],
                    "attestation": [
                        "clientDataJSON": encodeBase64URL(credential.rawClientDataJSON),
                        "attestationObject": encodeBase64URL(attestationObject)
                    ]
                ],
                "clientExtensionResults": [:]
            ])
        case (.authentication, let credential as ASAuthorizationPlatformPublicKeyCredentialAssertion):
            let credentialId = encodeBase64URL(credential.credentialID)
            call.resolve([
                "payload": [
                    "credential": [
                        "id": credentialId,
                        "rawId": credentialId,
                        "type": "public-key"
                    ],
                    "assertion": [
                        "clientDataJSON": encodeBase64URL(credential.rawClientDataJSON),
                        "authenticatorData": encodeBase64URL(credential.rawAuthenticatorData),
                        "signature": encodeBase64URL(credential.signature),
                        "userHandle": encodeBase64URL(credential.userID)
                    ]
                ],
                "credentialId": credentialId,
                "clientExtensionResults": [:]
            ])
        default:
            call.reject("Unexpected passkey response")
        }

        finish()
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        pendingCall?.reject(error.localizedDescription)
        finish()
    }
}

extension NativePasskeysPlugin: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
