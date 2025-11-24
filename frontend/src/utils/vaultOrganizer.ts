/**
 * AI Vault Organizer - Auto-tag and categorize vault entries
 * 
 * Uses intelligent pattern matching to suggest tags and categories
 * based on entry name, URL, username, and other metadata.
 */

import type { VaultEntry } from '../types/vault';

export interface OrganizerSuggestion {
  category?: string;
  tags?: string[];
  confidence: number; // 0-1
  reasoning?: string;
}

/**
 * Extract domain from URL
 */
function extractDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Detect category from entry data
 */
function detectCategory(entry: Partial<VaultEntry>): { category: string; confidence: number; reasoning?: string } {
  const name = (entry.name || '').toLowerCase();
  const url = entry.url?.toLowerCase() || '';
  const domain = extractDomain(entry.url)?.toLowerCase() || '';
  const username = (entry.username || '').toLowerCase();

  // Banking/Finance
  if (
    name.includes('bank') || name.includes('chase') || name.includes('wells fargo') ||
    name.includes('paypal') || name.includes('venmo') || name.includes('stripe') ||
    name.includes('credit card') || name.includes('card') ||
    domain.includes('bank') || domain.includes('chase.com') || domain.includes('wellsfargo.com') ||
    domain.includes('paypal.com') || domain.includes('venmo.com')
  ) {
    return { category: 'Credit Card', confidence: 0.9, reasoning: 'Detected banking/financial service' };
  }

  // Social Media
  if (
    name.includes('facebook') || name.includes('twitter') || name.includes('instagram') ||
    name.includes('linkedin') || name.includes('tiktok') || name.includes('snapchat') ||
    domain.includes('facebook.com') || domain.includes('twitter.com') || domain.includes('instagram.com') ||
    domain.includes('linkedin.com') || domain.includes('tiktok.com') || domain.includes('snapchat.com')
  ) {
    return { category: 'Login', confidence: 0.95, reasoning: 'Detected social media platform' };
  }

  // Email
  if (
    name.includes('email') || name.includes('gmail') || name.includes('outlook') ||
    name.includes('yahoo mail') || name.includes('icloud') ||
    domain.includes('gmail.com') || domain.includes('outlook.com') || domain.includes('yahoo.com') ||
    domain.includes('icloud.com') || username.includes('@')
  ) {
    return { category: 'Login', confidence: 0.9, reasoning: 'Detected email service' };
  }

  // Shopping/E-commerce
  if (
    name.includes('amazon') || name.includes('ebay') || name.includes('shopify') ||
    name.includes('etsy') || name.includes('store') || name.includes('shop') ||
    domain.includes('amazon.com') || domain.includes('ebay.com') || domain.includes('shopify.com')
  ) {
    return { category: 'Login', confidence: 0.85, reasoning: 'Detected e-commerce platform' };
  }

  // Work/Business
  if (
    name.includes('work') || name.includes('business') || name.includes('office') ||
    name.includes('slack') || name.includes('microsoft') || name.includes('google workspace') ||
    domain.includes('slack.com') || domain.includes('microsoft.com') || domain.includes('google.com')
  ) {
    return { category: 'Login', confidence: 0.8, reasoning: 'Detected work/business service' };
  }

  // Developer/Tech
  if (
    name.includes('github') || name.includes('gitlab') || name.includes('bitbucket') ||
    name.includes('aws') || name.includes('azure') || name.includes('docker') ||
    domain.includes('github.com') || domain.includes('gitlab.com') || domain.includes('aws.amazon.com')
  ) {
    return { category: 'Login', confidence: 0.85, reasoning: 'Detected developer/tech service' };
  }

  // Streaming/Entertainment
  if (
    name.includes('netflix') || name.includes('spotify') || name.includes('youtube') ||
    name.includes('hulu') || name.includes('disney') || name.includes('prime video') ||
    domain.includes('netflix.com') || domain.includes('spotify.com') || domain.includes('youtube.com')
  ) {
    return { category: 'Login', confidence: 0.9, reasoning: 'Detected streaming/entertainment service' };
  }

  // Gaming
  if (
    name.includes('steam') || name.includes('epic games') || name.includes('xbox') ||
    name.includes('playstation') || name.includes('nintendo') || name.includes('game') ||
    domain.includes('steam.com') || domain.includes('epicgames.com')
  ) {
    return { category: 'Login', confidence: 0.85, reasoning: 'Detected gaming platform' };
  }

  // Secure Note (if it has notes but no URL/username)
  if (entry.notes && !entry.url && !entry.username) {
    return { category: 'Secure Note', confidence: 0.7, reasoning: 'Has notes but no login credentials' };
  }

  // Default to Login
  return { category: 'Login', confidence: 0.5, reasoning: 'Default category' };
}

/**
 * Generate tags from entry data
 */
function generateTags(entry: Partial<VaultEntry>): string[] {
  const tags: Set<string> = new Set();
  const name = (entry.name || '').toLowerCase();
  const url = entry.url?.toLowerCase() || '';
  const domain = extractDomain(entry.url)?.toLowerCase() || '';
  const username = (entry.username || '').toLowerCase();

  // Domain-based tags
  if (domain) {
    const domainParts = domain.split('.');
    if (domainParts.length > 0) {
      tags.add(domainParts[0]); // e.g., 'github' from 'github.com'
    }
  }

  // Service type tags
  if (name.includes('work') || name.includes('business') || domain.includes('slack.com') || domain.includes('microsoft.com')) {
    tags.add('work');
  }
  if (name.includes('personal') || name.includes('home')) {
    tags.add('personal');
  }
  if (name.includes('2fa') || name.includes('two-factor') || entry.totpSecret) {
    tags.add('2fa');
  }
  if (name.includes('important') || name.includes('critical')) {
    tags.add('important');
  }
  if (name.includes('shared') || name.includes('team')) {
    tags.add('shared');
  }

  // Platform tags
  const platforms = ['ios', 'android', 'web', 'desktop', 'mobile'];
  for (const platform of platforms) {
    if (name.includes(platform) || url.includes(platform)) {
      tags.add(platform);
    }
  }

  // Security tags
  if (entry.password && entry.password.length >= 20) {
    tags.add('strong-password');
  }
  if (entry.breachCount && entry.breachCount > 0) {
    tags.add('breached');
  }

  // Category-based tags
  if (entry.category) {
    tags.add(entry.category.toLowerCase().replace(/\s+/g, '-'));
  }

  return Array.from(tags).slice(0, 5); // Limit to 5 tags
}

/**
 * Organize entry - suggest category and tags
 */
export function organizeEntry(entry: Partial<VaultEntry>): OrganizerSuggestion {
  const categoryResult = detectCategory(entry);
  const tags = generateTags(entry);

  return {
    category: categoryResult.category,
    tags,
    confidence: categoryResult.confidence,
    reasoning: categoryResult.reasoning
  };
}

/**
 * Batch organize multiple entries
 */
export function organizeEntries(entries: Partial<VaultEntry>[]): Map<string, OrganizerSuggestion> {
  const suggestions = new Map<string, OrganizerSuggestion>();
  
  for (const entry of entries) {
    if (entry.id) {
      suggestions.set(entry.id, organizeEntry(entry));
    }
  }
  
  return suggestions;
}

/**
 * Auto-apply suggestions to entry (if confidence is high enough)
 */
export function autoApplySuggestions(
  entry: VaultEntry,
  threshold: number = 0.8
): VaultEntry {
  const suggestion = organizeEntry(entry);
  
  if (suggestion.confidence >= threshold) {
    return {
      ...entry,
      category: suggestion.category || entry.category,
      tags: [...new Set([...(entry.tags || []), ...(suggestion.tags || [])])]
    };
  }
  
  return entry;
}

