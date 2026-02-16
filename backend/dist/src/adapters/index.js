"use strict";
/**
 * Storage Adapter Factory
 * Exports the appropriate adapter based on DB_ADAPTER environment variable
 *
 * Supported adapters:
 * - 'file' (default): In-memory storage, data lost on restart
 * - 'prisma': SQL database (PostgreSQL, MySQL, SQLite) via Prisma ORM
 * - 'mongo': MongoDB database
 *
 * To switch adapters, set DB_ADAPTER in .env file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeVault = exports.readVault = exports.adapter = void 0;
const config_1 = require("../config");
const fileAdapter_1 = require("./fileAdapter");
const prismaAdapter_1 = require("./prismaAdapter");
const mongoAdapter_1 = require("./mongoAdapter");
/**
 * Gets the configured storage adapter
 */
function getAdapter() {
    switch (config_1.config.dbAdapter) {
        case 'prisma':
            console.log('📦 Using Prisma adapter (SQL database)');
            return prismaAdapter_1.prismaAdapter;
        case 'mongo':
            console.log('📦 Using MongoDB adapter');
            return mongoAdapter_1.mongoAdapter;
        case 'file':
        default:
            console.log('📦 Using file adapter (in-memory)');
            return fileAdapter_1.fileAdapter;
    }
}
// Export the configured adapter
exports.adapter = getAdapter();
// Re-export adapter methods for convenience
const readVault = () => exports.adapter.readVault();
exports.readVault = readVault;
const writeVault = (vault) => exports.adapter.writeVault(vault);
exports.writeVault = writeVault;
