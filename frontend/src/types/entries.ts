export const ENTRY_KINDS = ['login', 'card', 'identity', 'note', 'totp'] as const

export type EntryKind = (typeof ENTRY_KINDS)[number]

export interface BaseEntry {
  id: string
  name: string
  tags: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface LoginEntry extends BaseEntry {
  kind: 'login'
  url?: string
  username: string
  password: string
  totpSecret?: string
}

export interface CardEntry extends BaseEntry {
  kind: 'card'
  cardholder: string
  number: string
  expiry: string
  cvv: string
  brand?: string
  billingZip?: string
}

export interface IdentityEntry extends BaseEntry {
  kind: 'identity'
  fullName: string
  email?: string
  phone?: string
  address?: string
  dob?: string
  docType?: string
  docNumber?: string
}

export interface NoteEntry extends BaseEntry {
  kind: 'note'
}

export interface TotpEntry extends BaseEntry {
  kind: 'totp'
  issuer: string
  totpSecret: string
}

export type Entry = LoginEntry | CardEntry | IdentityEntry | NoteEntry | TotpEntry

export type EntryFieldName =
  | 'url'
  | 'username'
  | 'password'
  | 'totpSecret'
  | 'cardholder'
  | 'number'
  | 'expiry'
  | 'cvv'
  | 'brand'
  | 'billingZip'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'address'
  | 'dob'
  | 'docType'
  | 'docNumber'
  | 'notes'
  | 'issuer'

export type EntryFieldType =
  | 'text'
  | 'password'
  | 'url'
  | 'email'
  | 'tel'
  | 'date'
  | 'textarea'
  | 'totp'

export interface EntryFieldConfig {
  name: EntryFieldName
  label: string
  type: EntryFieldType
  required?: boolean
  autocomplete?: string
  placeholder?: string
}

export interface EntryKindSchema {
  label: string
  description: string
  fields: readonly EntryFieldConfig[]
}

export const ENTRY_SCHEMAS: Readonly<Record<EntryKind, EntryKindSchema>> = {
  login: {
    label: 'Login',
    description: 'Store credentials for a website, app, or service.',
    fields: [
      { name: 'url', label: 'Website', type: 'url', autocomplete: 'url' },
      { name: 'username', label: 'Username or email', type: 'text', required: true, autocomplete: 'username' },
      { name: 'password', label: 'Password', type: 'password', required: true, autocomplete: 'new-password' },
      { name: 'totpSecret', label: 'One-time password secret', type: 'totp' }
    ]
  },
  card: {
    label: 'Payment card',
    description: 'Store payment card details and billing information.',
    fields: [
      { name: 'cardholder', label: 'Cardholder name', type: 'text', required: true, autocomplete: 'cc-name' },
      { name: 'number', label: 'Card number', type: 'text', required: true, autocomplete: 'cc-number' },
      { name: 'expiry', label: 'Expiry', type: 'text', required: true, autocomplete: 'cc-exp' },
      { name: 'cvv', label: 'Security code', type: 'password', required: true, autocomplete: 'cc-csc' },
      { name: 'brand', label: 'Card brand', type: 'text' },
      { name: 'billingZip', label: 'Billing postal code', type: 'text', autocomplete: 'postal-code' }
    ]
  },
  identity: {
    label: 'Identity',
    description: 'Store personal details and identity document references.',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, autocomplete: 'name' },
      { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
      { name: 'phone', label: 'Phone', type: 'tel', autocomplete: 'tel' },
      { name: 'address', label: 'Address', type: 'textarea', autocomplete: 'street-address' },
      { name: 'dob', label: 'Date of birth', type: 'date', autocomplete: 'bday' },
      { name: 'docType', label: 'Document type', type: 'text' },
      { name: 'docNumber', label: 'Document number', type: 'text' }
    ]
  },
  note: {
    label: 'Secure note',
    description: 'Store private text that does not fit another record type.',
    fields: [{ name: 'notes', label: 'Note', type: 'textarea', required: true }]
  },
  totp: {
    label: 'Authenticator code',
    description: 'Store a standalone time-based one-time password.',
    fields: [
      { name: 'issuer', label: 'Issuer', type: 'text', required: true },
      { name: 'totpSecret', label: 'One-time password secret', type: 'totp', required: true }
    ]
  }
}

export type LegacyEntryRecord = Record<string, unknown> & {
  id: string
  name: string
  kind?: unknown
}

export type MigratedEntry<T extends LegacyEntryRecord> = Omit<T, 'kind'> & {
  kind: EntryKind
}

export function isEntryKind(value: unknown): value is EntryKind {
  return typeof value === 'string' && ENTRY_KINDS.some((kind) => kind === value)
}

/**
 * Adds the discriminator required by the new model without normalizing or dropping
 * legacy fields. Runtime migration is intentionally separate from vault crypto.
 */
export function migrateLegacyEntry<T extends LegacyEntryRecord>(entry: T): MigratedEntry<T> {
  return {
    ...entry,
    kind: isEntryKind(entry.kind) ? entry.kind : 'login'
  } as MigratedEntry<T>
}

export function migrateLegacyEntries<T extends LegacyEntryRecord>(entries: readonly T[]): MigratedEntry<T>[] {
  return entries.map(migrateLegacyEntry)
}
