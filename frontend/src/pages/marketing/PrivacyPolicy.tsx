import React from 'react'
import LegalPageShell from '../../components/marketing/LegalPageShell'

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalPageShell
      eyebrow="Privacy"
      title="Privacy Policy"
      summary="SafeNode is built around a zero-knowledge security model. We collect the minimum account, billing, and operational data required to run the service and keep the platform secure."
      lastUpdated="March 2026"
    >
      <section>
        <h2>1. Scope</h2>
        <p>
          This Privacy Policy explains how SafeNode collects, uses, stores, and discloses information when you use
          the SafeNode applications, website, hosted billing flows, and related support channels.
        </p>
      </section>

      <section>
        <h2>2. Data we collect</h2>
        <p>We collect only the data required to operate the service, secure accounts, and process subscriptions.</p>
        <ul>
          <li>Account data such as email address, optional display name, and account status metadata.</li>
          <li>Security telemetry such as device identifiers, user agent, IP-derived access logs, and audit events.</li>
          <li>Billing metadata such as subscription tier, subscription status, transaction identifiers, and provider references.</li>
          <li>Support communications you send to SafeNode directly.</li>
        </ul>
      </section>

      <section>
        <h2>3. Zero-knowledge vault design</h2>
        <p>
          Vault contents are encrypted client-side before storage or transmission. SafeNode is designed so that the
          service does not have the material required to decrypt vault contents. Your master-password-derived secrets
          are not available to SafeNode operations staff.
        </p>
      </section>

      <section>
        <h2>4. How we use data</h2>
        <ul>
          <li>To create and maintain your account.</li>
          <li>To authenticate sessions, manage devices, and enforce subscription limits.</li>
          <li>To send transactional emails such as verification, password reset, and billing notices.</li>
          <li>To investigate abuse, defend the service, and maintain auditability.</li>
          <li>To comply with legal, tax, and financial reporting obligations.</li>
        </ul>
      </section>

      <section>
        <h2>5. Infrastructure and subprocessors</h2>
        <p>SafeNode uses third-party infrastructure providers to operate the service.</p>
        <ul>
          <li>Paddle for subscription billing and merchant-of-record payment processing.</li>
          <li>Resend for transactional email delivery.</li>
          <li>Vercel for application hosting and deployment infrastructure.</li>
          <li>Supabase for managed database infrastructure.</li>
        </ul>
      </section>

      <section>
        <h2>6. Retention</h2>
        <p>
          We retain account and service records for as long as your account remains active and as required for
          security, tax, fraud-prevention, and legal compliance purposes. When you delete your account, SafeNode will
          remove data according to the product deletion workflow and any mandatory retention obligations.
        </p>
      </section>

      <section>
        <h2>7. Security controls</h2>
        <p>
          SafeNode uses layered controls including client-side encryption, hardened password hashing, HTTPS, access
          logging, rate limiting, signed webhooks, and controlled operational access. No system is risk-free, but the
          service is designed to minimize blast radius and stored plaintext exposure.
        </p>
      </section>

      <section>
        <h2>8. Your choices</h2>
        <ul>
          <li>You may update your account information from the product where supported.</li>
          <li>You may cancel paid subscriptions subject to the billing terms below.</li>
          <li>You may request account deletion by contacting support.</li>
          <li>You may export vault data using product capabilities when available.</li>
        </ul>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>
          SafeNode is not directed to children under the age required by applicable law to enter into a service
          contract. If we learn that an account was created unlawfully, we may disable or remove it.
        </p>
      </section>

      <section>
        <h2>10. Changes</h2>
        <p>
          We may update this policy over time. Material changes will be reflected on this page with an updated date.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Privacy questions can be sent to <a href="mailto:support@safe-node.app">support@safe-node.app</a>.
        </p>
      </section>
    </LegalPageShell>
  )
}

export default PrivacyPolicyPage
