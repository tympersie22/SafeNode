"use strict";
/**
 * Email Service
 * Handles sending verification emails and transactional emails
 * Supports multiple email providers (Resend, SendGrid, Nodemailer)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const config_1 = require("../config");
function getFetch() {
    if (typeof globalThis.fetch !== 'function') {
        throw new Error('Global fetch is unavailable. Use Node.js 18+ runtime.');
    }
    return globalThis.fetch.bind(globalThis);
}
class EmailService {
    provider;
    apiKey = null;
    constructor() {
        // Determine email provider from environment
        if (process.env.RESEND_API_KEY) {
            this.provider = 'resend';
            this.apiKey = process.env.RESEND_API_KEY;
        }
        else if (process.env.SENDGRID_API_KEY) {
            this.provider = 'sendgrid';
            this.apiKey = process.env.SENDGRID_API_KEY;
        }
        else if (process.env.SMTP_HOST) {
            this.provider = 'nodemailer';
        }
        else {
            this.provider = 'none';
            if (config_1.config.nodeEnv === 'production') {
                console.warn('⚠️  No email provider configured. Email verification will not work.');
            }
            else {
                console.log('📧 Email service disabled (no provider configured)');
            }
        }
    }
    /**
     * Send verification email
     */
    async sendVerificationEmail(email, token, name) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify?token=${token}`;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - SafeNode</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 600;">Verify Your Email</h1>
    </div>
    
    <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
      Hi ${name || 'there'},
    </p>
    
    <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
      Thanks for signing up for SafeNode! Please verify your email address by clicking the button below:
    </p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
        Verify Email Address
      </a>
    </div>
    
    <p style="color: #999; font-size: 14px; margin-top: 30px; margin-bottom: 10px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #667eea; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 12px; border-radius: 6px; margin: 0;">
      ${verificationUrl}
    </p>
    
    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e5e5;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        This link will expire in 24 hours. If you didn't create a SafeNode account, you can safely ignore this email.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} SafeNode. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim();
        const text = `
Hi ${name || 'there'},

Thanks for signing up for SafeNode! Please verify your email address by visiting:

${verificationUrl}

This link will expire in 24 hours. If you didn't create a SafeNode account, you can safely ignore this email.

© ${new Date().getFullYear()} SafeNode. All rights reserved.
    `.trim();
        await this.send({
            to: email,
            subject: 'Verify Your Email - SafeNode',
            html,
            text
        });
    }
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, token, name) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password?token=${token}`;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - SafeNode</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
    </div>
    
    <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
      Hi ${name || 'there'},
    </p>
    
    <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
      We received a request to reset your SafeNode password. Click the button below to create a new password:
    </p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${resetUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
        Reset Password
      </a>
    </div>
    
    <p style="color: #999; font-size: 14px; margin-top: 30px; margin-bottom: 10px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #667eea; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 12px; border-radius: 6px; margin: 0;">
      ${resetUrl}
    </p>
    
    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e5e5;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} SafeNode. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim();
        await this.send({
            to: email,
            subject: 'Reset Your Password - SafeNode',
            html,
            text: `Reset your password: ${resetUrl}`
        });
    }
    /**
     * Send email using configured provider
     */
    async send(options) {
        if (this.provider === 'none') {
            // In development, just log the email
            if (config_1.config.nodeEnv === 'development') {
                console.log('📧 [EMAIL] Would send email:', {
                    to: options.to,
                    subject: options.subject,
                    preview: options.html.substring(0, 100) + '...'
                });
                return;
            }
            throw new Error('Email service not configured');
        }
        try {
            switch (this.provider) {
                case 'resend':
                    await this.sendWithResend(options);
                    break;
                case 'sendgrid':
                    await this.sendWithSendGrid(options);
                    break;
                case 'nodemailer':
                    await this.sendWithNodemailer(options);
                    break;
            }
        }
        catch (error) {
            console.error('Failed to send email:', error);
            throw new Error(`Email sending failed: ${error?.message || 'Unknown error'}`);
        }
    }
    /**
     * Send email using Resend
     */
    async sendWithResend(options) {
        if (!this.apiKey) {
            throw new Error('RESEND_API_KEY not configured');
        }
        const fetch = getFetch();
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM || 'SafeNode <noreply@safe-node.app>',
                to: [options.to],
                subject: options.subject,
                html: options.html,
                text: options.text
            })
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(error.message || 'Failed to send email via Resend');
        }
    }
    /**
     * Send email using SendGrid
     */
    async sendWithSendGrid(options) {
        if (!this.apiKey) {
            throw new Error('SENDGRID_API_KEY not configured');
        }
        const fetch = getFetch();
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personalizations: [{
                        to: [{ email: options.to }]
                    }],
                from: {
                    email: process.env.EMAIL_FROM || 'noreply@safe-node.app',
                    name: 'SafeNode'
                },
                subject: options.subject,
                content: [
                    {
                        type: 'text/html',
                        value: options.html
                    },
                    ...(options.text ? [{
                            type: 'text/plain',
                            value: options.text
                        }] : [])
                ]
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to send email via SendGrid: ${error}`);
        }
    }
    /**
     * Send email using Nodemailer (SMTP)
     */
    async sendWithNodemailer(options) {
        // Dynamic import to avoid adding nodemailer as required dependency
        // @ts-ignore - nodemailer may not be installed
        const nodemailer = await Promise.resolve().then(() => __importStar(require('nodemailer')));
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'SafeNode <noreply@safe-node.app>',
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text
        });
    }
}
exports.emailService = new EmailService();
