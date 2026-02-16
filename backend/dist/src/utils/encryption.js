"use strict";
/**
 * Encryption Utilities
 * Provides AES-GCM encryption/decryption for vault data at rest
 *
 * SECURITY NOTES:
 * - ENCRYPTION_KEY must be a 32-byte base64-encoded key
 * - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * - Rotate encryption keys periodically in production
 * - If ENCRYPTION_KEY is not set, encryption is skipped (development only)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptBuffer = encryptBuffer;
exports.decryptBuffer = decryptBuffer;
exports.encryptString = encryptString;
exports.decryptString = decryptString;
exports.isEncryptionEnabled = isEncryptionEnabled;
exports.encryptWithConfig = encryptWithConfig;
exports.decryptWithConfig = decryptWithConfig;
const crypto_1 = require("crypto");
const config_1 = require("../config");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for AES-GCM
const KEY_LENGTH = 32; // 32 bytes for AES-256
/**
 * Derives a 32-byte key from a string using SHA-256
 * This is a fallback if ENCRYPTION_KEY is not base64
 */
function deriveKey(keyString) {
    if (keyString.length === 44 && /^[A-Za-z0-9+/=]+$/.test(keyString)) {
        // Looks like base64, try to decode
        try {
            const decoded = Buffer.from(keyString, 'base64');
            if (decoded.length === KEY_LENGTH) {
                return decoded;
            }
        }
        catch {
            // Not valid base64, fall through to hash
        }
    }
    // Fallback: hash the string to get 32 bytes
    return (0, crypto_1.createHash)('sha256').update(keyString).digest();
}
/**
 * Encrypts a buffer using AES-256-GCM
 * @param plain - Plaintext buffer to encrypt
 * @param key - Encryption key (32-byte base64 string or any string for fallback)
 * @returns Encrypted data with IV and auth tag
 */
function encryptBuffer(plain, key) {
    if (!key) {
        throw new Error('Encryption key is required');
    }
    const keyBuffer = deriveKey(key);
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, keyBuffer, iv);
    cipher.setAAD(Buffer.from('safenode-vault', 'utf8')); // Additional authenticated data
    const encrypted = Buffer.concat([
        cipher.update(plain),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    return {
        iv: iv.toString('base64'),
        ciphertext: encrypted.toString('base64'),
        authTag: authTag.toString('base64')
    };
}
/**
 * Decrypts a buffer using AES-256-GCM
 * @param ciphertextBase64 - Base64 encoded ciphertext
 * @param ivBase64 - Base64 encoded IV
 * @param key - Encryption key (must match the key used for encryption)
 * @param authTagBase64 - Base64 encoded authentication tag
 * @returns Decrypted buffer
 */
function decryptBuffer(ciphertextBase64, ivBase64, key, authTagBase64) {
    if (!key) {
        throw new Error('Encryption key is required');
    }
    const keyBuffer = deriveKey(key);
    const iv = Buffer.from(ivBase64, 'base64');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    if (iv.length !== IV_LENGTH) {
        throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
    }
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, keyBuffer, iv);
    decipher.setAAD(Buffer.from('safenode-vault', 'utf8'));
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);
    return decrypted;
}
/**
 * Encrypts a string (convenience wrapper)
 */
function encryptString(plain, key) {
    return encryptBuffer(Buffer.from(plain, 'utf8'), key);
}
/**
 * Decrypts to a string (convenience wrapper)
 */
function decryptString(ciphertextBase64, ivBase64, key, authTagBase64) {
    return decryptBuffer(ciphertextBase64, ivBase64, key, authTagBase64).toString('utf8');
}
/**
 * Checks if encryption is enabled
 */
function isEncryptionEnabled() {
    return config_1.config.encryptionKey !== null;
}
/**
 * Encrypts using the configured encryption key (if available)
 */
function encryptWithConfig(plain) {
    if (!config_1.config.encryptionKey) {
        return null;
    }
    return encryptBuffer(plain, config_1.config.encryptionKey);
}
/**
 * Decrypts using the configured encryption key (if available)
 */
function decryptWithConfig(ciphertextBase64, ivBase64, authTagBase64) {
    if (!config_1.config.encryptionKey) {
        return null;
    }
    return decryptBuffer(ciphertextBase64, ivBase64, config_1.config.encryptionKey, authTagBase64);
}
