/**
 * SafeNode Crypto Utilities
 * WebCrypto-based encryption primitives with PBKDF2 fallback for demo
 * 
 * Note: Replace PBKDF2 with Argon2 for production use
 */

export interface EncryptionResult {
  encrypted: ArrayBuffer;
  iv: ArrayBuffer;
  salt: ArrayBuffer;
}

export interface DecryptionParams {
  encrypted: ArrayBuffer;
  iv: ArrayBuffer;
  salt: ArrayBuffer;
}

/**
 * Generate a cryptographically secure random salt
 */
export async function generateSalt(length: number = 32): Promise<ArrayBuffer> {
  if (window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues(new Uint8Array(length)).buffer;
  }
  
  // Fallback for older browsers
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array.buffer;
}

/**
 * Derive key from password using PBKDF2 (WebCrypto implementation)
 * TODO: Replace with Argon2 for production
 */
export async function deriveKey(
  password: string,
  salt: ArrayBuffer
): Promise<CryptoKey> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('WebCrypto API not supported');
  }

  const { argon2id } = await import('hash-wasm')
  const hashHex = await argon2id({
    password,
    salt: new Uint8Array(salt),
    iterations: 3,
    memorySize: 64 * 1024, // KiB
    parallelism: 1,
    hashLength: 32,
    outputType: 'hex'
  })

  const rawKeyBytes = hexToArrayBuffer(hashHex)
  const key = await window.crypto.subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
  return key
}

function hexToArrayBuffer (hex: string): ArrayBuffer {
  const len = hex.length / 2
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return out.buffer
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(
  data: string,
  password: string,
  salt?: ArrayBuffer
): Promise<EncryptionResult> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('WebCrypto API not supported');
  }

  // Generate salt if not provided
  const encryptionSalt = salt || await generateSalt();
  
  // Derive key from password
  const key = await deriveKey(password, encryptionSalt);
  
  // Generate random IV
  const iv = await generateSalt(12); // 12 bytes for AES-GCM
  
  // Convert data to ArrayBuffer
  const dataBuffer = new TextEncoder().encode(data);
  
  // Encrypt the data
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  );

  return {
    encrypted,
    iv,
    salt: encryptionSalt
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(
  params: DecryptionParams,
  password: string
): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('WebCrypto API not supported');
  }

  // Derive key from password using the same salt
  const key = await deriveKey(password, params.salt);
  
  // Decrypt the data
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: params.iv
    },
    key,
    params.encrypted
  );

  // Convert back to string
  return new TextDecoder().decode(decrypted);
}

/**
 * Convert ArrayBuffer to base64 string for storage/transmission
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// SHA-1 (for HIBP k-anonymity). Returns uppercase hex
export async function sha1HexUpper(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const digest = await window.crypto.subtle.digest('SHA-1', data)
  const bytes = new Uint8Array(digest)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

// Query backend proxy to HIBP range API to get breach count for a password
export async function getPasswordBreachCount(password: string): Promise<number> {
  if (!password) return 0
  const sha1 = await sha1HexUpper(password)
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)
  const res = await fetch(`/api/breach/range/${prefix}`)
  if (!res.ok) return 0
  const text = await res.text()
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const [suf, countStr] = line.split(':')
    if (!suf || !countStr) continue
    if (suf.trim().toUpperCase() === suffix.toUpperCase()) {
      const n = parseInt(countStr.trim(), 10)
      return isNaN(n) ? 0 : n
    }
  }
  return 0
}

/**
 * Hash a string using SHA-256
 */
export async function sha256(input: string): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('WebCrypto API not supported');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- TOTP utilities ---
export function base32ToBytes (base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = base32.replace(/=+$/,'').toUpperCase().replace(/\s+/g, '')
  let bits = ''
  for (const c of clean) {
    const val = alphabet.indexOf(c)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return new Uint8Array(bytes)
}

export async function generateTotpCode (base32Secret: string, timeStepSec: number = 30, digits: number = 6): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / timeStepSec)
  const counterBuf = new ArrayBuffer(8)
  const view = new DataView(counterBuf)
  view.setUint32(4, counter >>> 0) // low
  view.setUint32(0, Math.floor(counter / 2 ** 32)) // high

  const keyData = base32ToBytes(base32Secret)
  const keyBuffer = keyData.buffer.slice(
    keyData.byteOffset,
    keyData.byteOffset + keyData.byteLength
  ) as ArrayBuffer
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const mac = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBuf)
  const macBytes = new Uint8Array(mac)
  const offset = macBytes[macBytes.length - 1] & 0x0f
  const code = ((macBytes[offset] & 0x7f) << 24) |
               ((macBytes[offset + 1] & 0xff) << 16) |
               ((macBytes[offset + 2] & 0xff) << 8) |
               (macBytes[offset + 3] & 0xff)
  const mod = 10 ** digits
  return String(code % mod).padStart(digits, '0')
}

/**
 * Generate a secure random password
 */
export async function generateSecurePassword(length: number = 32): Promise<string> {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  return password;
}

// --- Secure Sharing (ECDH P-256 + HKDF + AES-GCM) ---
export interface SharingEnvelope {
  alg: 'ECDH-P256-HKDF-AESGCM';
  iv: string; // base64
  salt: string; // base64 (HKDF salt)
  senderPubJwk: JsonWebKey;
  ciphertext: string; // base64
}

export async function generateEcdhKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  )
}

export async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey('jwk', key)
}

export async function exportPrivateKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey('jwk', key)
}

export async function importPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  )
}

export async function importPrivateKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )
}

async function hkdfDeriveAesKey(privateKey: CryptoKey, publicKey: CryptoKey, salt: ArrayBuffer): Promise<CryptoKey> {
  const shared = await window.crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256)
  // Use HKDF with SHA-256 to turn shared secret into AES-GCM key
  const hkdfKey = await window.crypto.subtle.importKey('raw', shared, { name: 'HKDF' }, false, ['deriveKey'])
  return await window.crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array([]) },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptForRecipient(plaintext: string, senderPriv: CryptoKey, senderPub: CryptoKey, recipientPub: CryptoKey): Promise<SharingEnvelope> {
  const salt = await generateSalt(32)
  const aesKey = await hkdfDeriveAesKey(senderPriv, recipientPub, salt)
  const iv = await generateSalt(12)
  const data = new TextEncoder().encode(plaintext)
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, data)
  return {
    alg: 'ECDH-P256-HKDF-AESGCM',
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    senderPubJwk: await exportPublicKeyJwk(senderPub),
    ciphertext: arrayBufferToBase64(ciphertext)
  }
}

export async function decryptFromSender(envelope: SharingEnvelope, recipientPriv: CryptoKey): Promise<string> {
  if (envelope.alg !== 'ECDH-P256-HKDF-AESGCM') throw new Error('Unsupported envelope')
  const senderPub = await importPublicKeyJwk(envelope.senderPubJwk)
  const salt = base64ToArrayBuffer(envelope.salt)
  const iv = base64ToArrayBuffer(envelope.iv)
  const aesKey = await hkdfDeriveAesKey(recipientPriv, senderPub, salt)
  const ct = base64ToArrayBuffer(envelope.ciphertext)
  const pt = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct)
  return new TextDecoder().decode(pt)
}
