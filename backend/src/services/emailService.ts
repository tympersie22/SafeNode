/**
 * Email Service
 * Handles sending verification emails and transactional emails
 * Supports multiple email providers (Resend, SendGrid, Nodemailer)
 */

import { config } from '../config'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

function getFetch(): typeof globalThis.fetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Global fetch is unavailable. Use Node.js 18+ runtime.')
  }
  return globalThis.fetch.bind(globalThis)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!)
}

class EmailService {
  private provider: 'resend' | 'sendgrid' | 'nodemailer' | 'none'
  private apiKey: string | null = null

  constructor() {
    // Determine email provider from environment
    if (process.env.RESEND_API_KEY) {
      this.provider = 'resend'
      this.apiKey = process.env.RESEND_API_KEY
    } else if (process.env.SENDGRID_API_KEY) {
      this.provider = 'sendgrid'
      this.apiKey = process.env.SENDGRID_API_KEY
    } else if (process.env.SMTP_HOST) {
      this.provider = 'nodemailer'
    } else {
      this.provider = 'none'
      if (config.nodeEnv === 'production') {
        console.warn('⚠️  No email provider configured. Email verification will not work.')
      } else {
        console.log('📧 Email service disabled (no provider configured)')
      }
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string, name?: string): Promise<void> {
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://safe-node.app'
    const verificationUrl = `${frontendBaseUrl}/auth/verify?token=${token}`
    const logoUrl = `${frontendBaseUrl}/Safenodelogo.png`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Safenode</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img
        src="${logoUrl}"
        alt="Safenode"
        width="72"
        height="72"
        style="display: block; width: 72px; height: 72px; object-fit: contain; margin: 0 auto 16px;"
      />
      <p style="margin: 0 0 10px; color: #0f172a; font-size: 13px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;">
        Safenode
      </p>
      <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 600;">Verify Your Email</h1>
    </div>
    
    <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
      Hi ${name || 'there'},
    </p>
    
    <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
      Thanks for signing up for Safenode! Please verify your email address by clicking the button below:
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
        This link will expire in 24 hours. If you didn't create a Safenode account, you can safely ignore this email.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} Safenode. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim()

    const text = `
Hi ${name || 'there'},

Thanks for signing up for Safenode! Please verify your email address by visiting:

${verificationUrl}

This link will expire in 24 hours. If you didn't create a Safenode account, you can safely ignore this email.

© ${new Date().getFullYear()} Safenode. All rights reserved.
    `.trim()

    await this.send({
      to: email,
      subject: 'Verify Your Email - Safenode',
      html,
      text
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, name?: string): Promise<void> {
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://safe-node.app'
    const resetUrl = `${frontendBaseUrl}/auth/reset-password?token=${token}`
    const logoUrl = `${frontendBaseUrl}/Safenodelogo.png`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Safenode</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img
        src="${logoUrl}"
        alt="Safenode"
        width="72"
        height="72"
        style="display: block; width: 72px; height: 72px; object-fit: contain; margin: 0 auto 16px;"
      />
      <p style="margin: 0 0 10px; color: #0f172a; font-size: 13px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;">
        Safenode
      </p>
      <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
    </div>
    
    <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
      Hi ${name || 'there'},
    </p>
    
    <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
      We received a request to reset your Safenode password. Click the button below to create a new password:
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
      © ${new Date().getFullYear()} Safenode. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim()

    await this.send({
      to: email,
      subject: 'Reset Your Password - Safenode',
      html,
      text: `Reset your password: ${resetUrl}`
    })
  }

  async sendDeviceReapprovalEmail(email: string, token: string, name?: string, deviceName?: string): Promise<void> {
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://safe-node.app'
    const approveUrl = `${frontendBaseUrl}/devices/approve?token=${token}`
    const logoUrl = `${frontendBaseUrl}/Safenodelogo.png`
    const recipientName = escapeHtml(name || 'there')
    const deviceLabel = deviceName ? `&quot;${escapeHtml(deviceName)}&quot;` : 'a device'

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approve a device - Safenode</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img
        src="${logoUrl}"
        alt="Safenode"
        width="72"
        height="72"
        style="display: block; width: 72px; height: 72px; object-fit: contain; margin: 0 auto 16px;"
      />
      <p style="margin: 0 0 10px; color: #0f172a; font-size: 13px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;">
        Safenode
      </p>
      <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 600;">Approve a device</h1>
    </div>

    <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
      Hi ${recipientName},
    </p>

    <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
      Someone is trying to access your Safenode vault from ${deviceLabel} that was previously removed from your account. If this was you, approve the device below. Approving only restores this device's access — it does not sign anyone in or unlock your vault.
    </p>

    <div style="text-align: center; margin: 40px 0;">
      <a href="${approveUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
        Approve this device
      </a>
    </div>

    <p style="color: #999; font-size: 14px; margin-top: 30px; margin-bottom: 10px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #667eea; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 12px; border-radius: 6px; margin: 0;">
      ${approveUrl}
    </p>

    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e5e5;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        This link will expire in 30 minutes and can be used once. If you didn't try to access your vault from a removed device, do not click it — ignore this email and consider changing your password.
      </p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} Safenode. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim()

    await this.send({
      to: email,
      subject: 'Approve a device - Safenode',
      html,
      text: `Approve a removed device for your Safenode account: ${approveUrl}`
    })
  }

  async sendSuccessorDesignationEmail(options: {
    to: string
    ownerName?: string
    waitingPeriodDays: number
    relationshipLabel?: string
    note?: string
  }): Promise<void> {
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://safe-node.app'
    const claimUrl = `${frontendBaseUrl}/auth/successor`
    const ownerName = options.ownerName || 'A Safenode account owner'

    await this.send({
      to: options.to,
      subject: 'You were added as a Safenode successor contact',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc;">
          <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
            <h1 style="margin: 0 0 12px; font-size: 24px;">You were added as a Safenode account successor</h1>
            <p style="margin: 0 0 16px; color: #475569;">${ownerName} designated this email as the successor contact for their Safenode account.</p>
            <p style="margin: 0 0 16px; color: #475569;">If a succession claim is ever started, there will be a ${options.waitingPeriodDays}-day delay so the current owner can cancel it.</p>
            ${options.relationshipLabel ? `<p style="margin: 0 0 12px; color: #475569;"><strong>Relationship:</strong> ${options.relationshipLabel}</p>` : ''}
            ${options.note ? `<div style="margin: 0 0 20px; padding: 16px; border-radius: 12px; background: #f8fafc; color: #334155;"><strong>Owner note:</strong><br />${options.note}</div>` : ''}
            <p style="margin: 0 0 20px; color: #475569;">If you ever need to start the process, use the successor claim page below.</p>
            <a href="${claimUrl}" style="display: inline-block; background: #0f766e; color: white; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">Open successor claim page</a>
          </div>
        </div>
      `.trim(),
      text: `${ownerName} designated you as a Safenode successor contact. If you ever need to start the process, visit ${claimUrl}.`
    })
  }

  async sendSuccessorClaimOwnerAlertEmail(options: {
    to: string
    ownerName?: string
    successorEmail: string
    claimAvailableAt: Date
  }): Promise<void> {
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://safe-node.app'
    const settingsUrl = `${frontendBaseUrl}/settings`

    await this.send({
      to: options.to,
      subject: 'Safenode succession claim started',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc;">
          <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
            <h1 style="margin: 0 0 12px; font-size: 24px;">A Safenode succession claim was started</h1>
            <p style="margin: 0 0 16px; color: #475569;">${options.successorEmail} requested account succession for ${options.ownerName || 'your account'}.</p>
            <p style="margin: 0 0 16px; color: #475569;">If this was not expected, cancel it from Account Settings before <strong>${options.claimAvailableAt.toUTCString()}</strong>.</p>
            <a href="${settingsUrl}" style="display: inline-block; background: #991b1b; color: white; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">Review in Account Settings</a>
          </div>
        </div>
      `.trim(),
      text: `${options.successorEmail} requested account succession. Cancel it from ${settingsUrl} before ${options.claimAvailableAt.toUTCString()}.`
    })
  }

  async sendSuccessorClaimSuccessorEmail(options: {
    to: string
    ownerEmail: string
    claimUrl: string
    claimAvailableAt: Date
  }): Promise<void> {
    await this.send({
      to: options.to,
      subject: 'Safenode succession claim in progress',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc;">
          <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
            <h1 style="margin: 0 0 12px; font-size: 24px;">Your Safenode succession claim is in progress</h1>
            <p style="margin: 0 0 16px; color: #475569;">A claim for ${options.ownerEmail} was started. The owner can cancel it during the waiting period.</p>
            <p style="margin: 0 0 16px; color: #475569;">You can complete the claim after <strong>${options.claimAvailableAt.toUTCString()}</strong>.</p>
            <a href="${options.claimUrl}" style="display: inline-block; background: #0f766e; color: white; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">Open claim status</a>
          </div>
        </div>
      `.trim(),
      text: `Your Safenode succession claim for ${options.ownerEmail} is in progress. Complete it after ${options.claimAvailableAt.toUTCString()}: ${options.claimUrl}`
    })
  }

  /**
   * Send email using configured provider
   */
  async send(options: EmailOptions): Promise<void> {
    if (this.provider === 'none') {
      // In development, just log the email
      if (config.nodeEnv === 'development') {
        console.log('📧 [EMAIL] Would send email:', {
          to: options.to,
          subject: options.subject,
          preview: options.html.substring(0, 100) + '...'
        })
        return
      }
      throw new Error('Email service not configured')
    }

    try {
      switch (this.provider) {
        case 'resend':
          await this.sendWithResend(options)
          break
        case 'sendgrid':
          await this.sendWithSendGrid(options)
          break
        case 'nodemailer':
          await this.sendWithNodemailer(options)
          break
      }
    } catch (error: any) {
      console.error('Failed to send email:', error)
      throw new Error(`Email sending failed: ${error?.message || 'Unknown error'}`)
    }
  }

  /**
   * Send email using Resend
   */
  private async sendWithResend(options: EmailOptions): Promise<void> {
    if (!this.apiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const fetch = getFetch()
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Safenode Security <security@mail.safe-node.app>',
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string }
      throw new Error(error.message || 'Failed to send email via Resend')
    }
  }

  /**
   * Send email using SendGrid
   */
  private async sendWithSendGrid(options: EmailOptions): Promise<void> {
    if (!this.apiKey) {
      throw new Error('SENDGRID_API_KEY not configured')
    }

    const fetch = getFetch()
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
          email: process.env.EMAIL_FROM || 'security@mail.safe-node.app',
          name: 'Safenode'
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
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email via SendGrid: ${error}`)
    }
  }

  /**
   * Send email using Nodemailer (SMTP)
   */
  private async sendWithNodemailer(options: EmailOptions): Promise<void> {
    // Dynamic import to avoid adding nodemailer as required dependency
    // @ts-ignore - nodemailer may not be installed
    const nodemailer = await import('nodemailer')
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Safenode Security <security@mail.safe-node.app>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    })
  }
}

export const emailService = new EmailService()
