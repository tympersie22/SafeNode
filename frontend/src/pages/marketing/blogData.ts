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
    title: 'Master Password Design: Balancing Security and Recovery',
    date: 'February 18, 2026',
    readTime: '4 min read',
    category: 'Security',
    excerpt: 'Why SafeNode never stores your master password and how to build safer recovery flows around it.',
    icon: KeyRound,
    content: [
      'SafeNode does not retain the master password, which protects user data from server-side credential disclosure but also means there is no direct password recovery path from us.',
      'Recovery is handled through account controls around identity, re-enrollment, and secure re-provisioning workflows, not by escrow of decryptable user keys.',
      'The product experience is designed to encourage strong passphrases and additional protection factors while keeping account recovery explicit and auditable.'
    ]
  }
]

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}
