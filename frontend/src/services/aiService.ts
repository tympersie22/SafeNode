/**
 * AI Service - Intelligent recommendations and organization
 * 
 * Supports both local ML models and optional cloud AI (OpenAI)
 * for privacy-focused intelligent features.
 */

import type { VaultEntry } from '../types/vault';

export interface AIRecommendation {
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: string;
  confidence: number;
  reasoning?: string;
}

export interface AICategorySuggestion {
  category: string;
  confidence: number;
  reasoning?: string;
}

export interface AITagSuggestion {
  tags: string[];
  confidence: number;
  reasoning?: string;
}

/**
 * AI Service Configuration
 */
export interface AIConfig {
  useLocalML: boolean;
  useCloudAI: boolean;
  openAIApiKey?: string;
  model?: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';
}

class AIService {
  private config: AIConfig = {
    useLocalML: true,
    useCloudAI: false,
    model: 'gpt-3.5-turbo'
  };

  /**
   * Configure AI service
   */
  configure(config: Partial<AIConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate intelligent security recommendations
   */
  async generateSecurityRecommendations(
    entries: VaultEntry[],
    healthSummary: any
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Local ML-based analysis
    if (this.config.useLocalML) {
      recommendations.push(...this.localSecurityAnalysis(entries, healthSummary));
    }

    // Cloud AI enhancement (if enabled)
    if (this.config.useCloudAI && this.config.openAIApiKey) {
      try {
        const cloudRecommendations = await this.cloudSecurityAnalysis(entries, healthSummary);
        recommendations.push(...cloudRecommendations);
      } catch (error) {
        console.warn('Cloud AI analysis failed, using local only:', error);
      }
    }

    // Sort by priority and confidence
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.confidence - a.confidence;
      })
      .slice(0, 10); // Top 10 recommendations
  }

  /**
   * Local ML-based security analysis
   */
  private localSecurityAnalysis(entries: VaultEntry[], healthSummary: any): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    const total = entries.length;

    // Analyze password patterns
    const passwordPatterns = this.analyzePasswordPatterns(entries);
    if (passwordPatterns.hasCommonPattern) {
      recommendations.push({
        priority: 'high',
        message: `Detected ${passwordPatterns.commonPatternCount} passwords following predictable patterns. Attackers often exploit these patterns. Consider using our password generator for truly random passwords.`,
        action: 'Generate secure passwords',
        confidence: 0.85,
        reasoning: `Found ${passwordPatterns.commonPatternCount} passwords with common patterns like sequential characters or keyboard walks`
      });
    }

    // Analyze reuse patterns
    const reuseAnalysis = this.analyzePasswordReuse(entries);
    if (reuseAnalysis.reuseScore > 0.3) {
      recommendations.push({
        priority: 'high',
        message: `You're reusing passwords across ${reuseAnalysis.uniquePasswords} unique passwords for ${total} accounts. This creates a single point of failure - if one account is compromised, others are at risk.`,
        action: 'Generate unique passwords',
        confidence: 0.9,
        reasoning: `Reuse ratio: ${(reuseAnalysis.reuseScore * 100).toFixed(0)}%`
      });
    }

    // Analyze age patterns
    const ageAnalysis = this.analyzePasswordAge(entries);
    if (ageAnalysis.oldPasswordCount > 0) {
      recommendations.push({
        priority: 'medium',
        message: `${ageAnalysis.oldPasswordCount} password${ageAnalysis.oldPasswordCount > 1 ? 's haven\'t' : ' hasn\'t'} been updated in over 90 days. While frequent rotation isn't always necessary, updating passwords after security incidents is crucial.`,
        action: 'Review old passwords',
        confidence: 0.75,
        reasoning: `Average password age: ${ageAnalysis.avgAgeDays.toFixed(0)} days`
      });
    }

    // Analyze breach correlation
    const breachAnalysis = this.analyzeBreachCorrelation(entries);
    if (breachAnalysis.correlationScore > 0.5) {
      recommendations.push({
        priority: 'high',
        message: `Your breached passwords share ${breachAnalysis.commonPatterns.join(', ')}. This suggests a pattern attackers might exploit. Consider a complete password reset strategy.`,
        action: 'Reset compromised passwords',
        confidence: 0.8,
        reasoning: `Found ${breachAnalysis.commonPatterns.length} common patterns in breached passwords`
      });
    }

    // Analyze domain security
    const domainAnalysis = this.analyzeDomainSecurity(entries);
    if (domainAnalysis.weakDomainCount > 0) {
      recommendations.push({
        priority: 'medium',
        message: `${domainAnalysis.weakDomainCount} account${domainAnalysis.weakDomainCount > 1 ? 's are' : ' is'} on services with known security issues. Consider enabling 2FA and using unique, strong passwords for these accounts.`,
        action: 'Review account security',
        confidence: 0.7,
        reasoning: `Identified ${domainAnalysis.weakDomainCount} accounts on potentially insecure services`
      });
    }

    return recommendations;
  }

  /**
   * Cloud AI analysis using OpenAI
   */
  private async cloudSecurityAnalysis(
    entries: VaultEntry[],
    healthSummary: any
  ): Promise<AIRecommendation[]> {
    if (!this.config.openAIApiKey) return [];

    try {
      // Prepare anonymized data for AI analysis
      const anonymizedData = {
        totalEntries: entries.length,
        weakPasswordCount: healthSummary.weakCount || 0,
        breachedCount: healthSummary.breachedCount || 0,
        reuseCount: healthSummary.reuseCount || 0,
        avgPasswordLength: this.calculateAvgPasswordLength(entries),
        has2FA: entries.filter(e => e.totpSecret).length,
        categories: [...new Set(entries.map(e => e.category))],
        // Don't send actual passwords or usernames
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openAIApiKey}`
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a security expert providing password management recommendations. Provide concise, actionable advice based on vault statistics. Never ask for actual passwords or sensitive data.'
            },
            {
              role: 'user',
              content: `Analyze this password vault security data and provide 3-5 intelligent recommendations: ${JSON.stringify(anonymizedData)}`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI API request failed');
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) return [];

      // Parse AI response into recommendations
      return this.parseAIRecommendations(aiResponse);
    } catch (error) {
      console.error('Cloud AI analysis error:', error);
      return [];
    }
  }

  /**
   * Parse AI response into structured recommendations
   */
  private parseAIRecommendations(aiResponse: string): AIRecommendation[] {
    // Simple parsing - in production, use structured output or better parsing
    const recommendations: AIRecommendation[] = [];
    const lines = aiResponse.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.match(/^\d+\.|^[-*]/)) {
        recommendations.push({
          priority: line.toLowerCase().includes('critical') || line.toLowerCase().includes('urgent') ? 'high' : 'medium',
          message: line.replace(/^\d+\.|^[-*]\s*/, '').trim(),
          confidence: 0.8,
          reasoning: 'AI-generated recommendation'
        });
      }
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Analyze password patterns using local ML
   */
  private analyzePasswordPatterns(entries: VaultEntry[]): {
    hasCommonPattern: boolean;
    commonPatternCount: number;
  } {
    let commonPatternCount = 0;
    const patterns = [
      /12345|abcde|qwerty/i,
      /(.)\1{2,}/, // Repeated characters
      /^[A-Z][a-z]+\d+$/, // Capital + lowercase + numbers pattern
      /\d{4,}$/, // Ending with many digits
    ];

    for (const entry of entries) {
      if (!entry.password) continue;
      for (const pattern of patterns) {
        if (pattern.test(entry.password)) {
          commonPatternCount++;
          break;
        }
      }
    }

    return {
      hasCommonPattern: commonPatternCount > 0,
      commonPatternCount
    };
  }

  /**
   * Analyze password reuse
   */
  private analyzePasswordReuse(entries: VaultEntry[]): {
    reuseScore: number;
    uniquePasswords: number;
  } {
    const passwordMap = new Map<string, number>();
    
    for (const entry of entries) {
      if (entry.password) {
        passwordMap.set(entry.password, (passwordMap.get(entry.password) || 0) + 1);
      }
    }

    const uniquePasswords = passwordMap.size;
    const totalEntries = entries.length;
    const reuseScore = totalEntries > 0 ? 1 - (uniquePasswords / totalEntries) : 0;

    return { reuseScore, uniquePasswords };
  }

  /**
   * Analyze password age
   */
  private analyzePasswordAge(entries: VaultEntry[]): {
    oldPasswordCount: number;
    avgAgeDays: number;
  } {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let oldCount = 0;
    let totalAge = 0;
    let count = 0;

    for (const entry of entries) {
      if (entry.passwordUpdatedAt) {
        const ageDays = (now - entry.passwordUpdatedAt) / dayMs;
        totalAge += ageDays;
        count++;
        if (ageDays > 90) {
          oldCount++;
        }
      }
    }

    return {
      oldPasswordCount: oldCount,
      avgAgeDays: count > 0 ? totalAge / count : 0
    };
  }

  /**
   * Analyze breach correlation
   */
  private analyzeBreachCorrelation(entries: VaultEntry[]): {
    correlationScore: number;
    commonPatterns: string[];
  } {
    const breachedEntries = entries.filter(e => e.breachCount && e.breachCount > 0);
    if (breachedEntries.length === 0) {
      return { correlationScore: 0, commonPatterns: [] };
    }

    const patterns: string[] = [];
    const passwordLengths = breachedEntries.map(e => e.password?.length || 0);
    const avgLength = passwordLengths.reduce((a, b) => a + b, 0) / passwordLengths.length;

    if (avgLength < 12) patterns.push('short passwords');
    if (breachedEntries.some(e => !/[A-Z]/.test(e.password || ''))) patterns.push('missing uppercase');
    if (breachedEntries.some(e => !/[0-9]/.test(e.password || ''))) patterns.push('missing numbers');

    return {
      correlationScore: patterns.length / 3,
      commonPatterns: patterns
    };
  }

  /**
   * Analyze domain security
   */
  private analyzeDomainSecurity(entries: VaultEntry[]): {
    weakDomainCount: number;
  } {
    // Known insecure or problematic domains (simplified - in production, use a database)
    const weakDomains = ['http://', 'localhost'];
    let weakCount = 0;

    for (const entry of entries) {
      if (entry.url && weakDomains.some(domain => entry.url?.includes(domain))) {
        weakCount++;
      }
    }

    return { weakDomainCount: weakCount };
  }

  /**
   * Calculate average password length
   */
  private calculateAvgPasswordLength(entries: VaultEntry[]): number {
    const lengths = entries
      .map(e => e.password?.length || 0)
      .filter(len => len > 0);
    return lengths.length > 0
      ? lengths.reduce((a, b) => a + b, 0) / lengths.length
      : 0;
  }

  /**
   * Enhanced category suggestion with ML
   */
  async suggestCategory(entry: Partial<VaultEntry>): Promise<AICategorySuggestion> {
    // Use existing organizer logic as base
    const { organizeEntry } = await import('../utils/vaultOrganizer');
    const suggestion = organizeEntry(entry);

    // Enhance with ML if available
    if (this.config.useCloudAI && this.config.openAIApiKey) {
      try {
        const mlSuggestion = await this.mlCategorySuggestion(entry);
        if (mlSuggestion.confidence > suggestion.confidence) {
          return mlSuggestion;
        }
      } catch (error) {
        console.warn('ML category suggestion failed:', error);
      }
    }

    return {
      category: suggestion.category || 'Login',
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning
    };
  }

  /**
   * ML-based category suggestion
   */
  private async mlCategorySuggestion(entry: Partial<VaultEntry>): Promise<AICategorySuggestion> {
    if (!this.config.openAIApiKey) {
      return { category: 'Login', confidence: 0.5 };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openAIApiKey}`
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a password manager assistant. Categorize entries into: Login, Credit Card, Secure Note, or Identity. Respond with only the category name.'
            },
            {
              role: 'user',
              content: `Name: ${entry.name || ''}, URL: ${entry.url || ''}, Username: ${entry.username ? '***' : ''}`
            }
          ],
          temperature: 0.3,
          max_tokens: 10
        })
      });

      const data = await response.json();
      const category = data.choices[0]?.message?.content?.trim() || 'Login';

      return {
        category: ['Login', 'Credit Card', 'Secure Note', 'Identity'].includes(category)
          ? category
          : 'Login',
        confidence: 0.85,
        reasoning: 'ML-based categorization'
      };
    } catch (error) {
      return { category: 'Login', confidence: 0.5 };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();

