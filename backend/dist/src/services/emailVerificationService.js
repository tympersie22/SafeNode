"use strict";
/**
 * Email Verification Service
 * Manages email verification tokens and verification flow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVerificationToken = createVerificationToken;
exports.verifyEmailToken = verifyEmailToken;
exports.resendVerificationEmail = resendVerificationEmail;
const crypto_1 = require("crypto");
const prisma_1 = require("../db/prisma");
const emailService_1 = require("./emailService");
const userService_1 = require("./userService");
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
/**
 * Generate a secure verification token
 */
function generateVerificationToken() {
    return (0, crypto_1.randomBytes)(32).toString('base64url');
}
/**
 * Create and send verification email
 */
async function createVerificationToken(userId, email, displayName) {
    const prisma = (0, prisma_1.getPrismaClient)();
    // Generate token
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    // Delete any existing tokens for this user
    await prisma.emailVerificationToken.deleteMany({
        where: {
            userId,
            usedAt: null
        }
    });
    // Create new token
    await prisma.emailVerificationToken.create({
        data: {
            userId,
            token,
            expiresAt
        }
    });
    // Send verification email
    try {
        await emailService_1.emailService.sendVerificationEmail(email, token, displayName);
    }
    catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't throw - token is still created, user can request resend
    }
    return token;
}
/**
 * Verify email token
 */
async function verifyEmailToken(token) {
    const prisma = (0, prisma_1.getPrismaClient)();
    // Find token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true }
    });
    if (!verificationToken) {
        return { success: false, error: 'Invalid verification token' };
    }
    if (verificationToken.user?.emailVerified) {
        return { success: true, userId: verificationToken.userId };
    }
    // Check if already used
    if (verificationToken.usedAt) {
        return { success: false, error: 'Verification token has already been used' };
    }
    // Check if expired
    if (verificationToken.expiresAt < new Date()) {
        return { success: false, error: 'Verification token has expired' };
    }
    // Mark token as used
    await prisma.emailVerificationToken.update({
        where: { token },
        data: { usedAt: new Date() }
    });
    // Update user email verified status
    await (0, userService_1.updateUser)(verificationToken.userId, {
        emailVerified: true
    });
    return { success: true, userId: verificationToken.userId };
}
/**
 * Resend verification email
 */
async function resendVerificationEmail(email) {
    const user = await (0, userService_1.findUserByEmail)(email);
    if (!user) {
        // Don't reveal if user exists
        return { success: true };
    }
    if (user.emailVerified) {
        return { success: false, error: 'Email is already verified' };
    }
    // Create new verification token
    await createVerificationToken(user.id, user.email, user.displayName);
    return { success: true };
}
