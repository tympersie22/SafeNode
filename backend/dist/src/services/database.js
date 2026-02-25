"use strict";
/**
 * Database Service
 * Abstraction layer for user data storage
 * Supports in-memory, MongoDB, and Prisma adapters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const config_1 = require("../config");
const prisma_1 = require("../db/prisma");
const prismaUserAdapter_1 = require("../db/adapters/prismaUserAdapter");
// In-memory storage for fallback/development
const inMemoryUsers = new Map();
const inMemoryUsersByEmail = new Map(); // email -> userId
class DatabaseService {
    adapter;
    isInitialized = false;
    constructor() {
        // Map 'file' adapter to 'memory' for backward compatibility
        this.adapter = config_1.config.dbAdapter === 'mongo' ? 'mongo'
            : config_1.config.dbAdapter === 'prisma' ? 'prisma'
                : 'memory';
    }
    async init() {
        if (this.isInitialized)
            return;
        if (this.adapter === 'prisma') {
            // STRICT MODE: Fail hard if Prisma connection fails
            // NO FALLBACK to in-memory database
            if (!config_1.config.databaseUrl) {
                const error = new Error('A Prisma database URL is required when using Prisma adapter. ' +
                    'Set DATABASE_URL or POSTGRES_PRISMA_URL (Vercel/Supabase).');
                console.error('❌ Database configuration error:', error.message);
                throw error;
            }
            try {
                await (0, prisma_1.initPrisma)();
                // Verify connection with a test query
                const prisma = (0, prisma_1.getPrismaClient)();
                await prisma.$queryRaw `SELECT 1`;
                console.log(`✅ Database adapter initialized: ${this.adapter} (Prisma)`);
                console.log(`   Connected to: ${config_1.config.databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
            }
            catch (error) {
                console.error('❌ CRITICAL: Prisma database connection failed!');
                console.error('   Error:', error.message);
                console.error('   Code:', error.code);
                console.error('');
                console.error('🔧 FIX REQUIRED:');
                console.error('   1. Ensure PostgreSQL is running');
                console.error('   2. Verify DATABASE_URL/POSTGRES_PRISMA_URL is correct');
                console.error('   3. Check database exists: psql -U postgres -c "\\l"');
                console.error('   4. Create database if needed: createdb safenode');
                console.error('   5. Check user permissions');
                console.error('');
                console.error('❌ Server will NOT start without a valid database connection.');
                console.error('   This prevents data loss and ensures production reliability.');
                throw error;
            }
        }
        else if (this.adapter === 'mongo') {
            // MongoDB initialization will be handled by mongoAdapter
            console.log(`📦 Database adapter initialized: ${this.adapter}`);
        }
        else {
            // Only allow in-memory in development mode
            if (config_1.config.nodeEnv === 'production') {
                throw new Error('In-memory database adapter is not allowed in production. ' +
                    'Please set DB_ADAPTER=prisma and provide DATABASE_URL.');
            }
            console.log(`⚠️  Database adapter initialized: ${this.adapter} (in-memory) - DEVELOPMENT ONLY`);
            console.log(`   WARNING: Data will be lost on server restart!`);
        }
        this.isInitialized = true;
    }
    users = {
        /**
         * Create a new user
         */
        async create(user) {
            // Ensure adapter is set (same pattern as emailExists)
            const adapter = this.adapter || (config_1.config.dbAdapter === 'mongo' ? 'mongo' : config_1.config.dbAdapter === 'prisma' ? 'prisma' : 'memory');
            console.log('[DatabaseService] users.create called:', {
                adapter: this.adapter,
                resolvedAdapter: adapter,
                configAdapter: config_1.config.dbAdapter,
                userId: user.id,
                email: user.email
            });
            if (adapter === 'prisma') {
                console.log('[DatabaseService] Routing to Prisma adapter');
                return prismaUserAdapter_1.prismaUserAdapter.create(user);
            }
            // Fallback to memory adapter
            console.log('[DatabaseService] Using memory adapter (WARNING: data will not persist)');
            inMemoryUsers.set(user.id, { ...user });
            inMemoryUsersByEmail.set(user.email.toLowerCase().trim(), user.id);
            return { ...user };
        },
        /**
         * Find user by ID
         */
        async findById(id) {
            // Ensure adapter is set (fix for undefined adapter issue)
            const adapter = this.adapter || (config_1.config.dbAdapter === 'mongo' ? 'mongo' : config_1.config.dbAdapter === 'prisma' ? 'prisma' : 'memory');
            if (adapter === 'prisma') {
                return prismaUserAdapter_1.prismaUserAdapter.findById(id);
            }
            // Fallback to memory adapter
            const user = inMemoryUsers.get(id);
            return user ? { ...user } : null;
        },
        /**
         * Find user by email
         */
        async findByEmail(email) {
            // Ensure adapter is set (fix for undefined adapter issue - can happen with module loading)
            const adapter = this.adapter || (config_1.config.dbAdapter === 'mongo' ? 'mongo' : config_1.config.dbAdapter === 'prisma' ? 'prisma' : 'memory');
            if (adapter === 'prisma') {
                return prismaUserAdapter_1.prismaUserAdapter.findByEmail(email);
            }
            // Fallback to memory adapter
            const userId = inMemoryUsersByEmail.get(email.toLowerCase().trim());
            if (!userId)
                return null;
            const user = inMemoryUsers.get(userId);
            return user ? { ...user } : null;
        },
        /**
         * Update user
         */
        async update(id, input) {
            // Ensure adapter is set (fix for undefined adapter issue)
            const adapter = this.adapter || (config_1.config.dbAdapter === 'mongo' ? 'mongo' : config_1.config.dbAdapter === 'prisma' ? 'prisma' : 'memory');
            if (adapter === 'prisma') {
                return prismaUserAdapter_1.prismaUserAdapter.update(id, input);
            }
            // Fallback to memory adapter
            const user = inMemoryUsers.get(id);
            if (!user)
                return null;
            const updated = {
                ...user,
                ...input,
                updatedAt: Date.now()
            };
            inMemoryUsers.set(id, updated);
            return { ...updated };
        },
        /**
         * Delete user
         */
        async delete(id) {
            if (this.adapter === 'prisma') {
                return prismaUserAdapter_1.prismaUserAdapter.delete(id);
            }
            // Fallback to memory adapter
            const user = inMemoryUsers.get(id);
            if (user) {
                inMemoryUsersByEmail.delete(user.email.toLowerCase().trim());
                inMemoryUsers.delete(id);
                return true;
            }
            return false;
        },
        /**
         * Check if email exists
         */
        async emailExists(email) {
            // Ensure adapter is set
            const adapter = this.adapter || (config_1.config.dbAdapter === 'mongo' ? 'mongo' : config_1.config.dbAdapter === 'prisma' ? 'prisma' : 'memory');
            const normalizedEmail = email.toLowerCase().trim();
            // Validate email before checking
            if (!normalizedEmail || normalizedEmail.length === 0) {
                console.warn('[DatabaseService] Empty email provided to emailExists');
                return false;
            }
            // Log for debugging (only in development)
            if (process.env.NODE_ENV === 'development') {
                console.log('[DatabaseService] emailExists check:', {
                    email: normalizedEmail,
                    adapter,
                    configAdapter: config_1.config.dbAdapter,
                    memoryUsersCount: inMemoryUsersByEmail.size
                });
            }
            if (adapter === 'prisma') {
                return prismaUserAdapter_1.prismaUserAdapter.emailExists(normalizedEmail);
            }
            // Fallback to memory adapter
            const exists = inMemoryUsersByEmail.has(normalizedEmail);
            if (process.env.NODE_ENV === 'development') {
                console.log('[DatabaseService] Memory adapter check result:', { email: normalizedEmail, exists });
            }
            return exists;
        }
    };
}
exports.db = new DatabaseService();
