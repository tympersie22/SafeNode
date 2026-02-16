"use strict";
/**
 * TOTP (Time-based One-Time Password) Library
 * Handles 2FA setup and verification for account login
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTOTPSecret = generateTOTPSecret;
exports.verifyTOTP = verifyTOTP;
exports.generateBackupCodes = generateBackupCodes;
exports.verifyBackupCode = verifyBackupCode;
exports.generateCurrentTOTPCode = generateCurrentTOTPCode;
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
// Configure TOTP settings
otplib_1.authenticator.options = {
    step: 30, // 30-second time windows
    window: 1, // Allow 1 time step tolerance
    digits: 6 // 6-digit codes
};
/**
 * Generate a new TOTP secret for a user
 */
async function generateTOTPSecret(userId, email, issuer = 'SafeNode') {
    const secret = otplib_1.authenticator.generateSecret();
    const otpAuthUrl = otplib_1.authenticator.keyuri(email, issuer, secret);
    // Generate QR code data URL
    const qrCodeUrl = await qrcode_1.default.toDataURL(otpAuthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 256,
        margin: 2
    });
    // Format manual entry key with spaces (standard format: XXXX XXXX XXXX XXXX)
    const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;
    return {
        secret,
        qrCodeUrl,
        manualEntryKey
    };
}
/**
 * Verify a TOTP code
 */
function verifyTOTP(secret, token) {
    try {
        const isValid = otplib_1.authenticator.verify({
            secret,
            token
        });
        if (isValid) {
            return {
                valid: true,
                delta: 0 // TOTP verified successfully, no time drift
            };
        }
        return { valid: false };
    }
    catch (error) {
        return { valid: false };
    }
}
/**
 * Generate backup codes for 2FA recovery
 * Returns array of 10 single-use codes
 */
function generateBackupCodes(count = 10) {
    const codes = [];
    const { randomBytes } = require('crypto');
    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric code
        const code = randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
}
/**
 * Verify a backup code
 * Removes used code from array
 */
function verifyBackupCode(backupCodes, code) {
    const normalizedCode = code.toUpperCase().trim();
    const index = backupCodes.indexOf(normalizedCode);
    if (index === -1) {
        return {
            valid: false,
            remainingCodes: backupCodes
        };
    }
    // Remove used code
    const remaining = [...backupCodes];
    remaining.splice(index, 1);
    return {
        valid: true,
        remainingCodes: remaining
    };
}
/**
 * Generate current TOTP code (for display)
 */
function generateCurrentTOTPCode(secret) {
    return otplib_1.authenticator.generate(secret);
}
