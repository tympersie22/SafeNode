# Safenode Passkey-First Architecture

## Product Thesis

Safenode should evolve from a password manager into a passkey-first identity, recovery, and team secret platform.

The product boundary becomes:

- authenticate with passkeys and trusted devices
- protect zero-knowledge vault contents with user-controlled key material
- recover access safely without weakening encryption
- govern personal and team secrets with auditable controls

This lets Safenode own the full lifecycle of digital access:

- sign-in
- unlock
- device trust
- recovery
- successor access
- team sharing
- secret rotation
- audit and posture

## Design Principles

1. Passkeys replace passwords for account authentication wherever possible.
2. Vault encryption remains zero-knowledge and must not depend on server-side secret escrow.
3. Recovery is explicit, auditable, and separate from server trust.
4. Team access is governed through durable permissions and wrapped keys, not ad hoc shared secrets.
5. Migration must preserve working accounts while giving users a clear path forward.

## Current State

Today Safenode is effectively:

- Safenode-managed authentication
- optional passkey and biometric support
- vault access still centered on a user passphrase / master-password model
- separate emerging team-vault and successor features

This means the product story has outgrown the current copy. The experience already includes identity, device, audit, billing, reports, and team controls, but the interface still presents itself mostly as a password vault.

## Target Architecture

### 1. Account Authentication

Primary:

- passkey-first sign-in
- device-bound WebAuthn credentials
- phishing-resistant authentication

Fallback:

- limited legacy password login during migration
- explicit recovery workflows for users who lose all passkeys

Target end state:

- new users do not need a login password
- old users can migrate off login passwords once recovery materials are configured

### 2. Vault Encryption Model

Target model:

- generate a random vault key per personal vault
- encrypt vault contents with that random key
- never derive the vault key directly from a reusable account password

Access model:

- wrap the vault key to trusted devices and approved recovery methods
- unwrap locally after passkey and device verification

Benefits:

- no reusable account password to phish or reuse
- cleaner separation between identity authentication and data decryption
- better support for multi-device and recovery flows

### 3. Recovery Model

Every account should support at least one of:

- recovery kit / recovery key
- secondary passkey
- successor and delegated recovery controls

Recovery must:

- never silently bypass zero-knowledge design
- be rate-limited and auditable
- require explicit user setup

### 4. Trusted Device Model

Trusted devices become first-class product objects:

- device registration
- device approval / reapproval
- device removal
- device posture and session visibility

Devices should be able to:

- hold wrapped vault access material
- use biometric unlock locally
- be revoked without rotating the entire account unless needed

### 5. Team Secret Architecture

Team vaults should become true shared workspaces:

- dedicated team vault key per shared vault
- per-member wrapped access to that vault key
- role and per-vault ACL enforcement
- auditable reads, writes, invites, and removals

Team vaults should store:

- shared credentials
- recovery material
- infrastructure and operational secrets
- break-glass records
- controlled notes and secure documents

They should not be treated as a sidecar to the personal vault UI.

### 6. Successor and Continuity Model

Successor access becomes part of product identity:

- designate successors
- define waiting periods
- require recovery prerequisites
- audit all attempts and approvals

The account transfer layer should manage identity continuity without pretending the service can decrypt a zero-knowledge vault on its own.

## Product Surface Redesign

### New Product Framing

Safenode should present itself as:

- passkey-first identity security
- recovery-ready zero-knowledge vaults
- trusted device and session control
- team secret governance

### Core Workspace Areas

1. Identity Vault
- personal secrets, passkeys, device posture, and access state

2. Security Posture
- breach issues, weak credentials, risky devices, recovery gaps

3. Recovery Center
- recovery kit, secondary factors, successor readiness

4. Team Secrets
- shared vaults, member access, role posture, operational records

5. Audit and Reports
- sessions, device changes, access history, exportable compliance views

## Migration Plan For Existing Users

### Phase 1: Passkey-First UX

- keep current vault passphrase model intact
- make passkeys the preferred sign-in path
- update product copy and dashboard language
- expose recovery readiness and device trust more prominently

### Phase 2: Wrapped-Key Migration

- introduce a random vault key for newly created vaults
- allow existing users to migrate from passphrase-derived access to wrapped vault-key access
- require recovery material before removing legacy login password

### Phase 3: New User Default

- new accounts are passkey-first from day one
- vault access uses wrapped key architecture
- no reusable login password is required

### Phase 4: Legacy Retirement

- password login becomes fallback-only
- passphrase-derived vaults are migrated or clearly flagged as legacy
- team vaults move to wrapped shared-key access and per-vault ACLs

## Logical Guardrails

To avoid repeating earlier account/vault mistakes:

1. Access denial must never be interpreted as "vault does not exist".
2. Re-initialization must never overwrite an existing vault without an explicit destructive migration flow.
3. Recovery and successor flows must not imply decryptability the backend does not actually have.
4. Team vault creation must persist stable cryptographic metadata in explicit fields, not user-facing descriptions.
5. UI labels must reflect the real architecture in production, not future aspirations that are not yet true.

## What Is Implemented Now vs. Later

Implemented now:

- passkey support
- biometric support
- device controls
- audit and reports
- successor controls
- team vault workspaces
- zero-knowledge personal vault model

Planned next:

- wrapped personal vault keys
- explicit recovery kit flows
- per-vault team ACL and wrapped team keys
- fully passkey-first onboarding
- deeper dashboard and website alignment around identity and recovery
