import { KeyRound, ServerCrash, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type BlogPost = {
  slug: string
  title: string
  date: string
  readTime: string
  category: string
  excerpt: string
  icon: LucideIcon
  content: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'zero-knowledge-encryption-architecture',
    title: 'How SafeNode Implements Zero-Knowledge Encryption',
    date: 'February 24, 2026',
    readTime: '6 min read',
    category: 'Architecture',
    excerpt: 'A practical breakdown of our client-side encryption model, key derivation, and sync boundaries.',
    icon: Shield,
    content: [
      'SafeNode follows a strict zero-knowledge model where encryption and decryption happen on the client device. Backend services only process encrypted payloads and metadata needed for sync and account workflows.',
      'Master passwords are never stored in plaintext and are not transmitted for vault decryption on the server. Key derivation is intentionally expensive to increase resistance against offline brute-force attacks.',
      'The sync boundary is designed so that a compromise of transport or backend storage does not reveal vault contents without the user-controlled encryption key material.'
    ]
  },
  {
    slug: 'incident-playbooks-api-degradation',
    title: 'Incident Playbooks: What Happens During API Degradation',
    date: 'February 20, 2026',
    readTime: '5 min read',
    category: 'Reliability',
    excerpt: 'The operational checklist we follow when auth, sync, or vault endpoints degrade in production.',
    icon: ServerCrash,
    content: [
      'When degradation is detected, we first classify impact across authentication, vault sync, and billing-critical endpoints. Readiness probes and error rates guide immediate triage.',
      'Mitigation starts with safe rollbacks, traffic stabilization, and dependency isolation. We preserve data integrity first, then restore full performance once error budgets recover.',
      'After recovery, we publish an internal incident summary with timeline, root cause, containment steps, and hardening actions that become part of future release gates.'
    ]
  },
  {
    slug: 'master-password-design-security-recovery',
    title: 'Passkey-First Identity: The Next SafeNode Architecture',
    date: 'May 8, 2026',
    readTime: '5 min read',
    category: 'Security',
    excerpt: 'Why passkeys should handle account authentication while a zero-knowledge vault key handles encrypted data.',
    icon: KeyRound,
    content: [
      'Passkeys are the right front door for SafeNode because they remove reusable login passwords and make phishing dramatically harder. They should handle account authentication, device trust, and step-up identity checks.',
      'Vault protection remains a separate problem. The long-term design is a random vault key wrapped to trusted devices and recovery methods, not a server-visible secret and not a simple replay of legacy password-manager assumptions.',
      'Recovery still has to be explicit and auditable. A passkey-first product only works if users can survive device loss, team transitions, and successor events without weakening the zero-knowledge model.'
    ]
  }
]

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}
