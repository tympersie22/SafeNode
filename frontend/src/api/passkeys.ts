import type { PasskeyRecord } from '../types/passkeys';

const base64UrlToBuffer = (value: string): ArrayBuffer => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const decoded = window.atob(padded);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes.buffer;
};

const bufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const listPasskeys = async (): Promise<PasskeyRecord[]> => {
  const res = await fetch('/api/passkeys');
  if (!res.ok) {
    throw new Error('Failed to load passkeys');
  }
  const data = await res.json();
  return data.passkeys as PasskeyRecord[];
};

export const deletePasskey = async (id: string): Promise<void> => {
  const res = await fetch(`/api/passkeys/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error('Failed to delete passkey');
  }
};

export const registerPasskey = async (friendlyName?: string): Promise<PasskeyRecord> => {
  const optionsResponse = await fetch('/api/passkeys/register/options', {
    method: 'POST'
  });
  if (!optionsResponse.ok) {
    throw new Error('Failed to begin passkey registration');
  }
  const optionsJson = await optionsResponse.json();

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlToBuffer(optionsJson.challenge),
    rp: optionsJson.rp,
    user: {
      ...optionsJson.user,
      id: base64UrlToBuffer(optionsJson.user.id)
    },
    pubKeyCredParams: optionsJson.pubKeyCredParams,
    timeout: optionsJson.timeout,
    attestation: optionsJson.attestation,
    authenticatorSelection: optionsJson.authenticatorSelection
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) {
    throw new Error('User cancelled passkey registration');
  }

  const attestationResponse = credential.response as AuthenticatorAttestationResponse;
  const transports = (attestationResponse as any).getTransports?.() ?? [];

  const verifyRes = await fetch('/api/passkeys/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        transports,
        signCount: (credential as any).signCount || 0
      },
      attestation: {
        clientDataJSON: bufferToBase64Url(attestationResponse.clientDataJSON),
        attestationObject: bufferToBase64Url(attestationResponse.attestationObject)
      },
      friendlyName
    })
  });

  if (!verifyRes.ok) {
    throw new Error('Failed to save passkey');
  }

  const data = await verifyRes.json();
  return data.passkey as PasskeyRecord;
};

export const authenticateWithPasskey = async (): Promise<void> => {
  const optionsResponse = await fetch('/api/passkeys/authenticate/options', {
    method: 'POST'
  });
  if (!optionsResponse.ok) {
    throw new Error('Failed to request authentication options');
  }
  const optionsJson = await optionsResponse.json();

  const allowCredentials = Array.isArray(optionsJson.allowCredentials)
    ? optionsJson.allowCredentials.map((cred: any) => ({
        type: cred.type,
        id: base64UrlToBuffer(cred.id || cred.rawId || ''),
        transports: cred.transports
      }))
    : undefined;

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(optionsJson.challenge),
    timeout: optionsJson.timeout,
    rpId: optionsJson.rpId,
    allowCredentials,
    userVerification: optionsJson.userVerification
  };

  const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!assertion) {
    throw new Error('User cancelled authentication');
  }

  const authResponse = assertion.response as AuthenticatorAssertionResponse;

  const verifyRes = await fetch('/api/passkeys/authenticate/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credential: {
        id: assertion.id,
        rawId: bufferToBase64Url(assertion.rawId),
        type: assertion.type
      },
      assertion: {
        clientDataJSON: bufferToBase64Url(authResponse.clientDataJSON),
        authenticatorData: bufferToBase64Url(authResponse.authenticatorData),
        signature: bufferToBase64Url(authResponse.signature),
        userHandle: authResponse.userHandle ? bufferToBase64Url(authResponse.userHandle) : null
      }
    })
  });

  if (!verifyRes.ok) {
    throw new Error('Failed to verify passkey authentication');
  }
};

