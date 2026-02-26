# SafeNode Open-Core Security Model

SafeNode follows an open-core model for trust-critical security components while keeping infrastructure and abuse-resistant operations private.

## Open Core (public)
- Client-side cryptography and key-derivation implementation details.
- Authentication and session protocol behavior.
- WebAuthn/passkey flow specifications.
- Security architecture docs and threat model assumptions.
- API contracts needed for community integrations.

## Private Core (internal)
- Production infrastructure configuration and secrets.
- Anti-abuse heuristics, incident-response runbooks, and operational playbooks.
- Billing operations and provider credentials.
- Internal monitoring, alert pipelines, and forensics workflows.

## Security Principles
- Server never receives plaintext vault secrets.
- Authenticated routes are default for all vault mutation/access endpoints.
- Billing webhooks are signature-verified and idempotent.
- Passkeys use server-side cryptographic verification with persisted credentials.
- New-user authentication tolerates brief propagation delays without lowering security requirements.

## Release Gate (before production)
- Backend: type-check, migration apply, health checks, webhook signature probes.
- Frontend: build check, auth + vault regression, passkey enrollment/login path.
- Security: RLS advisor clean, domain/TLS verification, no exposed secrets.
