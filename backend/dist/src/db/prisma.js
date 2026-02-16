"use strict";
/**
 * Prisma Database Client
 * Centralized Prisma client instance for SafeNode
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = void 0;
exports.getPrismaClient = getPrismaClient;
exports.initPrisma = initPrisma;
exports.disconnectPrisma = disconnectPrisma;
exports.healthCheck = healthCheck;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
const config_1 = require("../config");
let prisma = null;
/**
 * Get or create Prisma client instance
 * Uses singleton pattern to avoid multiple connections
 */
function getPrismaClient() {
    if (!prisma) {
        prisma = new client_1.PrismaClient({
            log: config_1.config.nodeEnv === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
            errorFormat: 'pretty'
        });
    }
    return prisma;
}
/**
 * Initialize Prisma connection
 */
async function initPrisma() {
    const client = getPrismaClient();
    try {
        await client.$connect();
        console.log('✅ Prisma connected to database');
    }
    catch (error) {
        console.error('❌ Failed to connect to database:', error);
        throw error;
    }
}
/**
 * Disconnect Prisma client
 */
async function disconnectPrisma() {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
        console.log('✅ Prisma disconnected');
    }
}
/**
 * Health check - test database connection
 */
async function healthCheck() {
    try {
        const client = getPrismaClient();
        await client.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    }
}
