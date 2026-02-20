"use strict";
/**
 * Database Seed
 * Idempotent seeding with stable demo user ID
 * Only seeds when DB is empty or SEED_ON_BOOT=true
 * Never drops users on dev restart unless explicitly requested
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemoAccount = seedDemoAccount;
exports.seedDatabase = seedDatabase;
const database_1 = require("../services/database");
const prisma_1 = require("./prisma");
const crypto_1 = require("crypto");
const password_1 = require("../utils/password");
const hash_wasm_1 = require("hash-wasm");
const DEMO_EMAIL = 'demo@safenode.app';
const DEMO_PASSWORD = 'demo-password';
// Stable demo user ID from env or deterministic generation
function getStableDemoUserId() {
    // Use DEMO_USER_ID from env if provided (for consistency across reseeds)
    if (process.env.DEMO_USER_ID) {
        return process.env.DEMO_USER_ID;
    }
    // Otherwise, generate deterministic ID from email
    // This ensures same ID across reseeds if env var not set
    const hash = (0, crypto_1.createHash)('sha256').update(DEMO_EMAIL).digest('hex');
    // Use first 25 chars of hash (cuid format is 25 chars)
    return `demo-${hash.substring(0, 20)}`;
}
/**
 * Encrypt an empty vault using the same crypto chain as the frontend:
 * 1. Argon2id (hash-wasm) for key derivation
 * 2. AES-256-GCM for encryption
 *
 * This produces ciphertext that the frontend's decrypt() can read.
 */
async function encryptVaultForSeed(password) {
    // 1. Generate 32-byte random salt
    const salt = (0, crypto_1.randomBytes)(32);
    // 2. Derive 32-byte key using Argon2id (same params as frontend crypto.ts)
    const keyHex = await (0, hash_wasm_1.argon2id)({
        password,
        salt: new Uint8Array(salt),
        iterations: 3,
        memorySize: 64 * 1024, // 64 MB in KiB
        parallelism: 1,
        hashLength: 32,
        outputType: 'hex'
    });
    const keyBuffer = Buffer.from(keyHex, 'hex');
    // 3. Generate 12-byte IV for AES-GCM
    const iv = (0, crypto_1.randomBytes)(12);
    // 4. Encrypt empty vault with AES-256-GCM
    const plaintext = JSON.stringify({ entries: [] });
    const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', keyBuffer, iv);
    const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    // WebCrypto's AES-GCM concatenates ciphertext + 16-byte auth tag
    const authTag = cipher.getAuthTag();
    const encrypted = Buffer.concat([ciphertext, authTag]);
    return {
        vaultSalt: salt.toString('base64'),
        vaultEncrypted: encrypted.toString('base64'),
        vaultIV: iv.toString('base64')
    };
}
/**
 * Check if database is empty (no users)
 */
async function isDatabaseEmpty() {
    try {
        const prisma = (0, prisma_1.getPrismaClient)();
        const userCount = await prisma.user.count();
        return userCount === 0;
    }
    catch (error) {
        console.error('Error checking database:', error);
        return false;
    }
}
/**
 * Upsert demo account by email (idempotent)
 * Uses stable demo user ID if provided in env
 */
async function seedDemoAccount() {
    try {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const forceReset = process.env.FORCE_RESET_DB === 'true';
        const stableDemoId = getStableDemoUserId();
        const prisma = (0, prisma_1.getPrismaClient)();
        const normalizedEmail = DEMO_EMAIL.toLowerCase().trim();
        // Hash password with pepper (same function used in userService)
        const passwordHash = await (0, password_1.hashPassword)(DEMO_PASSWORD);
        // Encrypt an empty vault so the demo user has a working vault out of the box
        // Master password = demo-password (same as login password for demo convenience)
        const { vaultSalt, vaultEncrypted, vaultIV } = await encryptVaultForSeed(DEMO_PASSWORD);
        // Upsert by email (idempotent - creates if not exists, updates if exists)
        // This ensures the user always exists with the correct password hash and vault
        const updateData = {
            passwordHash, // Always update password hash in case pepper changed
            role: 'superadmin',
            subscriptionTier: 'enterprise',
            emailVerified: true,
            displayName: 'Demo Admin',
            // Always update vault data to ensure demo user has a working vault
            vaultSalt,
            vaultEncrypted,
            vaultIV,
            vaultVersion: 1
        };
        // Bump tokenVersion if force reset
        if (forceReset && nodeEnv !== 'production') {
            const existing = await database_1.db.users.findByEmail(normalizedEmail);
            if (existing) {
                updateData.tokenVersion = (existing.tokenVersion || 1) + 1;
            }
        }
        const demoUser = await prisma.user.upsert({
            where: { email: normalizedEmail },
            update: updateData,
            create: {
                id: stableDemoId,
                email: normalizedEmail,
                passwordHash,
                displayName: 'Demo Admin',
                role: 'superadmin',
                subscriptionTier: 'enterprise',
                emailVerified: true,
                vaultSalt,
                vaultEncrypted,
                vaultIV,
                vaultVersion: 1,
                tokenVersion: 1
            }
        });
        console.log(`✅ Seed user upserted: ${normalizedEmail}`);
        console.log(`   User ID: ${demoUser.id}`);
        console.log(`   Email: ${normalizedEmail}`);
        console.log(`   Password: ${DEMO_PASSWORD}`);
        console.log(`   Master Password: ${DEMO_PASSWORD}`);
        console.log(`   Vault: initialized with empty entries`);
        console.log(`   Role: superadmin`);
        console.log(`   Subscription: enterprise`);
    }
    catch (error) {
        console.error('❌ Error seeding demo account:', error);
        throw error;
    }
}
/**
 * Initialize database with seed data (idempotent)
 *
 * Rules:
 * - Only seeds when DB is empty OR SEED_ON_BOOT=true
 * - Never deletes users on dev restart unless FORCE_RESET_DB=true
 * - In production: Only runs if FORCE_SEED=true
 * - Bumps tokenVersion on reseed to invalidate old tokens
 */
async function seedDatabase() {
    try {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const forceSeed = process.env.FORCE_SEED === 'true';
        const seedOnBoot = process.env.SEED_ON_BOOT === 'true';
        const forceReset = process.env.FORCE_RESET_DB === 'true';
        // PRODUCTION SAFETY: Only seed if explicitly forced
        if (nodeEnv === 'production' && !forceSeed) {
            console.log('⚠️  Skipping database seeding - production mode (use FORCE_SEED=true to override)');
            return;
        }
        // Check if database is empty
        const isEmpty = await isDatabaseEmpty();
        // Only seed if:
        // 1. Database is empty, OR
        // 2. SEED_ON_BOOT=true is set
        if (!isEmpty && !seedOnBoot && !forceReset) {
            console.log('✅ Database already has users - skipping seed (set SEED_ON_BOOT=true to force)');
            return;
        }
        // Show banner if seeding will invalidate tokens
        if (forceReset && nodeEnv !== 'production') {
            console.log('');
            console.log('⚠️  ════════════════════════════════════════════════════════════');
            console.log('⚠️  WARNING: FORCE_RESET_DB=true - Token version will be bumped');
            console.log('⚠️  All existing JWT tokens will be invalidated');
            console.log('⚠️  Users will need to log in again');
            console.log('⚠️  ════════════════════════════════════════════════════════════');
            console.log('');
        }
        if (nodeEnv === 'production') {
            console.log('🌱 Seeding database (production mode - FORCE_SEED=true)...');
        }
        else {
            console.log('🌱 Seeding database (development mode)...');
        }
        // Create demo admin account (idempotent upsert)
        await seedDemoAccount();
        console.log('✅ Database seeding completed');
    }
    catch (error) {
        console.error('❌ Database seeding failed:', error);
        // Don't throw - allow server to start even if seeding fails
    }
}
