"use strict";
/**
 * User Service
 * Handles user authentication, registration, and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.authenticateUser = authenticateUser;
exports.findUserById = findUserById;
exports.findUserByEmail = findUserByEmail;
exports.updateUser = updateUser;
exports.emailExists = emailExists;
exports.verifyMasterPassword = verifyMasterPassword;
exports.updateVault = updateVault;
const crypto_1 = require("crypto");
const database_1 = require("./database");
const password_1 = require("../utils/password");
/**
 * Create a new user account
 */
async function createUser(input) {
    console.log('[userService] Creating user:', { email: input.email });
    // Hash the account password (not master password)
    // Uses password utility with pepper support
    const passwordHash = await (0, password_1.hashPassword)(input.password);
    // Generate vault salt for master password derivation
    const vaultSalt = (0, crypto_1.randomBytes)(32).toString('base64');
    const now = Date.now();
    const user = {
        id: `user-${now}-${(0, crypto_1.randomBytes)(8).toString('hex')}`,
        email: input.email.toLowerCase().trim(),
        passwordHash,
        displayName: input.displayName || input.email.split('@')[0],
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
        // Vault configuration (empty vault initially)
        vaultSalt,
        vaultEncrypted: '',
        vaultIV: '',
        vaultVersion: 0,
        // Account settings
        twoFactorEnabled: false,
        twoFactorBackupCodes: [],
        biometricEnabled: false,
        // Subscription (defaults to free)
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        // Role (defaults to user)
        role: 'user',
        // Token versioning (starts at 1)
        tokenVersion: 1,
        // Device limits
        devices: []
    };
    console.log('[userService] User object created, calling db.users.create:', {
        userId: user.id,
        email: user.email
    });
    try {
        const created = await database_1.db.users.create(user);
        console.log('[userService] User created successfully:', {
            userId: created.id,
            email: created.email
        });
        created.tokenVersion = 1;
        return created;
    }
    catch (error) {
        console.error('[userService] Error in db.users.create:', {
            error: error.message,
            errorStack: error.stack,
            userId: user.id,
            email: user.email
        });
        throw error;
    }
}
/**
 * Authenticate a user by email and password
 */
async function authenticateUser(email, password) {
    try {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await database_1.db.users.findByEmail(normalizedEmail);
        if (!user) {
            return { user: null, reason: 'USER_NOT_FOUND' };
        }
        // Verify password hash with timeout protection
        const verifyPromise = (0, password_1.verifyPassword)(password, user.passwordHash);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Password verification timeout')), 30000));
        const valid = await Promise.race([verifyPromise, timeoutPromise]);
        if (!valid) {
            return { user: null, reason: 'BAD_PASSWORD' };
        }
        // Update last login time (don't wait for this to complete)
        database_1.db.users.update(user.id, {
            lastLoginAt: Date.now()
        }).catch(err => console.error('Failed to update last login:', err));
        return {
            user: {
                ...user,
                lastLoginAt: Date.now()
            },
            reason: 'SUCCESS'
        };
    }
    catch (error) {
        // If timeout or other error, treat as bad password
        if (error?.message?.includes('timeout')) {
            return { user: null, reason: 'BAD_PASSWORD' };
        }
        throw new Error(`Authentication failed: ${error?.message || 'Unknown error'}`);
    }
}
/**
 * Find user by ID
 */
async function findUserById(id) {
    return database_1.db.users.findById(id);
}
/**
 * Find user by email
 */
async function findUserByEmail(email) {
    return database_1.db.users.findByEmail(email.toLowerCase().trim());
}
/**
 * Update user
 */
async function updateUser(id, input) {
    return database_1.db.users.update(id, {
        ...input,
        updatedAt: Date.now()
    });
}
/**
 * Check if email is already registered
 */
async function emailExists(email) {
    // Normalize email (should already be normalized, but be safe)
    const normalizedEmail = email.toLowerCase().trim();
    if (database_1.db.users.emailExists) {
        return database_1.db.users.emailExists(normalizedEmail);
    }
    // Fallback for older adapters
    const user = await database_1.db.users.findByEmail(normalizedEmail);
    return user !== null;
}
/**
 * Verify master password for vault unlock
 * This validates that the user knows their master password
 * without exposing it to the server
 */
async function verifyMasterPassword(userId, masterPassword) {
    const user = await findUserById(userId);
    if (!user) {
        return { valid: false, salt: '' };
    }
    // In zero-knowledge architecture, we don't verify the master password on server
    // The client derives the key and attempts to decrypt the vault
    // If decryption succeeds, the password is correct
    // We return the salt so the client can derive the key
    return {
        valid: true, // Client will verify by decrypting
        salt: user.vaultSalt
    };
}
/**
 * Update vault data (encrypted by client)
 */
async function updateVault(userId, encryptedVault, iv, version) {
    return updateUser(userId, {
        vaultEncrypted: encryptedVault,
        vaultIV: iv,
        vaultVersion: version
    });
}
