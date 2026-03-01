import React from 'react'
import { Link } from 'react-router-dom'
import LegalPageShell from '../../components/marketing/LegalPageShell'

export const RefundPolicyPage: React.FC = () => {
  return (
    <LegalPageShell
      eyebrow="Billing Policy"
      title="Refund Policy"
      summary="SafeNode subscription refunds are handled against fraud, duplicate billing, and clear service issues while operating through Paddle as merchant of record."
      lastUpdated="March 2026"
    >
      <section>
        <h2>1. Scope</h2>
        <p>
          This Refund Policy applies to paid SafeNode subscriptions purchased through Paddle. Paddle acts as the
          merchant of record for SafeNode billing transactions.
        </p>
      </section>

      <section>
        <h2>2. Eligible refund scenarios</h2>
        <p>Refund requests may be reviewed for situations including:</p>
        <ul>
          <li>Duplicate charges for the same subscription period.</li>
          <li>Accidental purchase or accidental renewal reported promptly.</li>
          <li>Material service availability or activation failure attributable to SafeNode.</li>
          <li>Fraudulent or unauthorized transactions subject to verification.</li>
        </ul>
      </section>

      <section>
        <h2>3. Non-refundable scenarios</h2>
        <ul>
          <li>Partial-period refunds after significant use of the paid service.</li>
          <li>Requests made after an extended delay from the billing event.</li>
          <li>Service dissatisfaction without a verifiable billing or service-delivery issue.</li>
          <li>Loss of access caused by forgotten credentials or user-side device/account issues.</li>
        </ul>
      </section>

      <section>
        <h2>4. Request window</h2>
        <p>
          To maximize the chance of approval, contact SafeNode as soon as possible after the billing event. Requests
          should generally be made within 14 days of the charge unless local law requires a different period.
        </p>
      </section>

      <section>
        <h2>5. How to request a refund</h2>
        <p>
          Email <a href="mailto:support@safe-node.app">support@safe-node.app</a> with the account email, billing date,
          plan, and the reason for the request. Include any Paddle receipt or transaction reference if available.
        </p>
      </section>

      <section>
        <h2>6. Processing</h2>
        <p>
          Approved refunds are processed through Paddle. Timing depends on Paddle and your payment method provider.
          Canceling a subscription prevents future renewals but does not automatically create a refund for past charges.
        </p>
      </section>

      <section>
        <h2>7. Related policies</h2>
        <p>
          See the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link> for related
          account, billing, and data-handling terms.
        </p>
      </section>
    </LegalPageShell>
  )
}

export default RefundPolicyPage
