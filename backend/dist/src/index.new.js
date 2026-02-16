"use strict";
/**
 * SafeNode Backend Entry Point
 * Initializes the server with adapters, graceful shutdown, and error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const adapters_1 = require("./adapters");
const config_1 = require("./config");
const seed_1 = require("./db/seed");
// Graceful shutdown handler
let server = null;
async function shutdown(signal) {
    console.log(`\n${signal} received, shutting down gracefully...`);
    if (server) {
        await server.close();
    }
    // Close database connections
    try {
        await adapters_1.adapter.close();
        console.log('✅ Database connections closed');
    }
    catch (error) {
        console.error('❌ Error closing database connections:', error);
    }
    process.exit(0);
}
// Register shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
/**
 * Start the server
 */
async function start() {
    try {
        console.log('🚀 Starting SafeNode backend...');
        console.log(`📦 Environment: ${config_1.config.nodeEnv}`);
        console.log(`💾 Database adapter: ${config_1.config.dbAdapter}`);
        // Initialize database adapter
        console.log('🔌 Connecting to database...');
        await adapters_1.adapter.init();
        // Seed database if needed (development or if SEED_ON_BOOT=true)
        if (config_1.config.nodeEnv === 'development' || process.env.SEED_ON_BOOT === 'true') {
            console.log('🌱 Seeding database...');
            await (0, seed_1.seedDatabase)();
            console.log('✅ Database seeding completed');
        }
        // Create Fastify app
        const app = await (0, app_1.createApp)();
        // Start server
        const address = await app.listen({
            port: config_1.config.port,
            host: '0.0.0.0'
        });
        server = app;
        console.log(`✅ Server listening on ${address}`);
        console.log(`📚 API documentation available at ${address}/docs`);
        console.log(`🏥 Health check: ${address}/health`);
        if (config_1.config.nodeEnv === 'development') {
            console.log('\n💡 Development mode enabled');
            console.log('   - Detailed logging enabled');
            console.log('   - CORS allows localhost origins');
        }
        if (config_1.config.nodeEnv === 'production') {
            console.log('\n🔒 Production mode enabled');
            console.log('   - Security headers enabled');
            console.log('   - Rate limiting active');
            if (config_1.config.encryptionKey) {
                console.log('   - Encryption at rest enabled');
            }
            else {
                console.log('   ⚠️  WARNING: Encryption at rest disabled (ENCRYPTION_KEY not set)');
            }
        }
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
start();
