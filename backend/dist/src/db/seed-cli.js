"use strict";
/**
 * CLI script for database seeding
 * Usage: pnpm seed [--reset]
 */
Object.defineProperty(exports, "__esModule", { value: true });
const seed_1 = require("./seed");
const prisma_1 = require("./prisma");
const prisma_2 = require("./prisma");
async function main() {
    const args = process.argv.slice(2);
    const reset = args.includes('--reset') || args.includes('-r');
    if (reset) {
        process.env.FORCE_RESET_DB = 'true';
        process.env.SEED_ON_BOOT = 'true';
        console.log('🔄 Reset mode: Will bump tokenVersion and invalidate old tokens');
    }
    else {
        process.env.SEED_ON_BOOT = 'true';
    }
    try {
        // Initialize Prisma
        await (0, prisma_2.initPrisma)();
        if (reset) {
            console.log('🗑️  Resetting database (bumping tokenVersion)...');
            const prisma = (0, prisma_1.getPrismaClient)();
            const users = await prisma.user.findMany();
            for (const user of users) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { tokenVersion: { increment: 1 } }
                });
            }
            console.log(`✅ Bumped tokenVersion for ${users.length} user(s)`);
        }
        // Seed database
        await (0, seed_1.seedDatabase)();
        console.log('✅ Seeding completed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}
main();
