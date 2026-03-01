import React from 'react'
import LegalPageShell from '../../components/marketing/LegalPageShell'

export const TermsOfServicePage: React.FC = () => {
  return (
    <LegalPageShell
      eyebrow="Terms"
      title="Terms of Service"
      summary="These terms govern access to SafeNode’s applications, infrastructure, and subscription plans. They describe account responsibilities, billing behavior, and the boundaries of the service."
      lastUpdated="March 2026"
    >
      <section>
        <h2>1. Acceptance</h2>
        <p>
          By creating an account, accessing the website, or using the SafeNode applications, you agree to these Terms
          of Service. If you do not accept these terms, do not use the service.
        </p>
      </section>

      <section>
        <h2>2. Service description</h2>
        <p>
          SafeNode is a subscription SaaS password manager and encrypted vault service for individuals, families, and
          teams. The service includes account management, encrypted vault storage, device management, passkey support,
          security alerts, and billing workflows.
        </p>
      </section>

      <section>
        <h2>3. Account responsibilities</h2>
        <ul>
          <li>You are responsible for your credentials, devices, and all activity under your account.</li>
          <li>You must provide accurate registration and billing information.</li>
          <li>You must protect your master password and recovery material.</li>
          <li>You must notify SafeNode promptly if you suspect unauthorized access.</li>
        </ul>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>You agree not to misuse the service.</p>
        <ul>
          <li>No unauthorized access attempts, reverse engineering, or abuse of service limits.</li>
          <li>No unlawful, fraudulent, or harmful use of the platform.</li>
          <li>No attempts to degrade availability, bypass product security boundaries, or exploit billing flows.</li>
        </ul>
      </section>

      <section>
        <h2>5. Subscriptions and billing</h2>
        <p>
          SafeNode offers both free and paid subscription tiers. Paid subscriptions are processed through Paddle as the
          merchant of record. Billing terms, taxes, and invoices may be handled through Paddle-hosted flows.
        </p>
        <ul>
          <li>Subscriptions renew according to the selected monthly or annual cycle unless canceled.</li>
          <li>Plan changes, cancellations, and renewals may take effect at the next applicable billing boundary.</li>
          <li>Feature access and resource limits depend on the current subscription tier.</li>
          <li>Refund handling is described in the SafeNode Refund Policy.</li>
        </ul>
      </section>

      <section>
        <h2>6. Data ownership</h2>
        <p>
          You retain ownership of the data you store in SafeNode. SafeNode does not claim ownership of your vault
          contents. Because the service uses a zero-knowledge design for vault data, SafeNode cannot generally decrypt
          or recover user vault contents.
        </p>
      </section>

      <section>
        <h2>7. Availability</h2>
        <p>
          SafeNode aims for reliable availability but does not guarantee uninterrupted service. Maintenance, third-party
          provider outages, abuse mitigation, or other operational events may affect availability.
        </p>
      </section>

      <section>
        <h2>8. Disclaimers and limitation of liability</h2>
        <p>
          The service is provided on an “as is” and “as available” basis to the maximum extent permitted by law.
          SafeNode is not liable for indirect, incidental, consequential, special, or punitive damages, including loss
          of profits, business interruption, or loss of access to encrypted data resulting from credential loss.
        </p>
      </section>

      <section>
        <h2>9. Suspension and termination</h2>
        <p>
          SafeNode may suspend or terminate accounts that violate these terms, create operational risk, or are required
          to be disabled for compliance reasons. You may stop using the service and request deletion of your account at
          any time.
        </p>
      </section>

      <section>
        <h2>10. Changes</h2>
        <p>
          We may update these terms as the product, billing model, or legal obligations change. Updated terms will be
          posted here with a revised effective date.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Questions about these terms can be sent to <a href="mailto:support@safe-node.app">support@safe-node.app</a>.
        </p>
      </section>
    </LegalPageShell>
  )
}

export default TermsOfServicePage
