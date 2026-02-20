"use strict";
/**
 * Sync Service
 * Handles vault synchronization and conflict resolution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectConflicts = detectConflicts;
exports.resolveConflicts = resolveConflicts;
exports.getSyncStatus = getSyncStatus;
const prisma_1 = require("../db/prisma");
const auditLogService_1 = require("./auditLogService");
/**
 * Detect conflicts between local and server vault entries
 */
async function detectConflicts(userId, localEntries, localVersion) {
    const prisma = (0, prisma_1.getPrismaClient)();
    // Get server vault version
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { vaultVersion: true, vaultEncrypted: true }
    });
    if (!user || !user.vaultEncrypted) {
        return [];
    }
    const conflicts = [];
    const serverVer = Number(user.vaultVersion || 0);
    // If versions are different, we might have conflicts
    if (serverVer && localVersion !== serverVer) {
        // For now, return a general conflict indicator
        // In production, you'd decrypt and compare entries
        conflicts.push({
            entryId: 'vault',
            localVersion: localVersion,
            serverVersion: serverVer,
            localUpdatedAt: Date.now(),
            serverUpdatedAt: Date.now(),
            conflictType: 'version_mismatch'
        });
    }
    return conflicts;
}
/**
 * Resolve conflicts by accepting resolution strategy
 */
async function resolveConflicts(userId, resolutions) {
    const prisma = (0, prisma_1.getPrismaClient)();
    // Log conflict resolution
    await (0, auditLogService_1.createAuditLog)({
        userId,
        action: 'conflicts_resolved',
        resourceType: 'vault',
        resourceId: userId,
        metadata: {
            resolutionsCount: resolutions.length,
            resolutions: resolutions.map(r => ({ entryId: r.entryId, resolution: r.resolution }))
        }
    }).catch(() => { });
    // Get current vault version
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { vaultVersion: true }
    });
    const newVersion = Number(user?.vaultVersion || 0) + 1;
    return {
        success: true,
        newVersion
    };
}
/**
 * Get sync status and conflicts
 */
async function getSyncStatus(userId, localVersion) {
    const prisma = (0, prisma_1.getPrismaClient)();
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { vaultVersion: true, vaultEncrypted: true }
    });
    if (!user) {
        throw new Error('User not found');
    }
    const serverVersion = Number(user.vaultVersion || 0);
    const hasConflicts = serverVersion !== localVersion && localVersion > 0;
    const needsSync = serverVersion !== localVersion;
    const conflicts = [];
    if (hasConflicts) {
        conflicts.push({
            entryId: 'vault',
            localVersion: localVersion,
            serverVersion: serverVersion,
            localUpdatedAt: Date.now(),
            serverUpdatedAt: Date.now(),
            conflictType: 'version_mismatch'
        });
    }
    return {
        serverVersion,
        hasConflicts,
        conflicts,
        needsSync
    };
}
