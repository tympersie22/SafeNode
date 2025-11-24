import React, { useEffect, useState } from 'react'
import { getPasswordBreachCount } from '../crypto/crypto'
import { aiService, type AIRecommendation } from '../services/aiService'

export interface AdvisorEntry {
  id: string
  name: string
  username: string
  password: string
  url?: string
}

interface SecurityAdvisorProps {
  entries: AdvisorEntry[]
}

type BreachMap = Record<string, number>

function scorePasswordStrength (password: string): { score: number; issues: string[] } {
  const issues: string[] = []
  let score = 0
  if (password.length >= 12) score += 1; else issues.push('Use at least 12 characters')
  if (/[a-z]/.test(password)) score += 1; else issues.push('Add lowercase letters')
  if (/[A-Z]/.test(password)) score += 1; else issues.push('Add uppercase letters')
  if (/[0-9]/.test(password)) score += 1; else issues.push('Add numbers')
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; else issues.push('Add special characters')
  if (/(.)\1{2,}/.test(password)) { score -= 1; issues.push('Avoid repeated characters') }
  return { score: Math.max(0, Math.min(5, score)), issues }
}

const SecurityAdvisor: React.FC<SecurityAdvisorProps> = ({ entries }) => {
  const [breaches, setBreaches] = React.useState<BreachMap>({})
  const [scanning, setScanning] = React.useState(false)

  const total = entries.length
  const byPassword = new Map<string, number>()
  for (const e of entries) {
    if (!byPassword.has(e.password)) byPassword.set(e.password, 0)
    byPassword.set(e.password, (byPassword.get(e.password) || 0) + 1)
  }
  const reusedPasswords = Array.from(byPassword.entries()).filter(([, c]) => c > 1).length
  const weakCount = entries.filter(e => scorePasswordStrength(e.password).score < 4).length
  const breachedCount = Object.values(breaches).filter(c => c > 0).length

  const runBreachScan = async () => {
    setScanning(true)
    const map: BreachMap = {}
    try {
      // Deduplicate by password to reduce calls
      const uniquePwds = Array.from(new Set(entries.map(e => e.password)))
      for (const pwd of uniquePwds) {
        // Skip empty
        if (!pwd) continue
        const count = await getPasswordBreachCount(pwd)
        map[pwd] = count
      }
      setBreaches(map)
    } finally {
      setScanning(false)
    }
  }

  const getBreachFor = (pwd: string) => breaches[pwd] || 0

  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Load AI recommendations
  useEffect(() => {
    if (entries.length === 0) {
      setAiRecommendations([]);
      return;
    }

    setIsLoadingAI(true);
    const healthSummary = {
      weakCount,
      breachedCount,
      reuseCount: reusedPasswords,
      total
    };

    aiService.generateSecurityRecommendations(entries, healthSummary)
      .then(recommendations => {
        setAiRecommendations(recommendations);
      })
      .catch(error => {
        console.error('Failed to generate AI recommendations:', error);
      })
      .finally(() => {
        setIsLoadingAI(false);
      });
  }, [entries, weakCount, breachedCount, reusedPasswords, total]);

  // AI-like intelligent recommendations (fallback to rule-based)
  const getRecommendations = (): Array<{ priority: 'high' | 'medium' | 'low'; message: string; action?: string }> => {
    const recommendations: Array<{ priority: 'high' | 'medium' | 'low'; message: string; action?: string }> = []
    
    // High priority: breached passwords
    if (breachedCount > 0) {
      recommendations.push({
        priority: 'high',
        message: `${breachedCount} password${breachedCount > 1 ? 's have' : ' has'} been found in data breaches. These are extremely vulnerable and should be changed immediately.`,
        action: 'Change breached passwords'
      })
    }

    // High priority: weak passwords
    if (weakCount > 0) {
      recommendations.push({
        priority: 'high',
        message: `${weakCount} password${weakCount > 1 ? 's are' : ' is'} too weak. Weak passwords can be cracked in seconds. Consider using our password generator.`,
        action: 'Strengthen weak passwords'
      })
    }

    // High priority: reused passwords
    if (reusedPasswords > 0) {
      recommendations.push({
        priority: 'high',
        message: `You're reusing passwords across ${reusedPasswords} account${reusedPasswords > 1 ? 's' : ''}. If one account is compromised, all accounts with the same password are at risk.`,
        action: 'Generate unique passwords'
      })
    }

    // Medium priority: old passwords
    const oldPasswordCount = entries.filter(e => {
      // Check if password hasn't been updated in 90+ days (if we had that data)
      return false // Placeholder - would need passwordUpdatedAt in AdvisorEntry
    }).length
    if (oldPasswordCount > 0) {
      recommendations.push({
        priority: 'medium',
        message: `${oldPasswordCount} password${oldPasswordCount > 1 ? 's haven\'t' : ' hasn\'t'} been updated in over 90 days. Regular password rotation improves security.`,
        action: 'Rotate old passwords'
      })
    }

    // Low priority: missing 2FA
    const entriesWithout2FA = entries.filter(e => !e.url || !e.url.includes('2fa')).length
    if (entriesWithout2FA > total * 0.5) {
      recommendations.push({
        priority: 'low',
        message: `Most of your accounts don't have two-factor authentication enabled. 2FA adds an extra layer of security even if your password is compromised.`,
        action: 'Enable 2FA where available'
      })
    }

    // Low priority: overall health
    const healthScore = total > 0 ? ((total - weakCount - breachedCount - reusedPasswords) / total) * 100 : 100
    if (healthScore < 70) {
      recommendations.push({
        priority: 'medium',
        message: `Your overall password health score is ${Math.round(healthScore)}%. Focus on fixing high-priority issues first.`,
        action: 'Review security recommendations'
      })
    } else if (healthScore >= 90) {
      recommendations.push({
        priority: 'low',
        message: `Great job! Your password security is strong. Keep it up by regularly reviewing and updating your passwords.`,
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  // Use AI recommendations if available, otherwise fallback to rule-based
  const recommendations = aiRecommendations.length > 0 
    ? aiRecommendations.map(r => ({ priority: r.priority, message: r.message, action: r.action }))
    : getRecommendations()

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Security Advisor</h3>
          <p className="text-xs text-slate-600">Strength, reuse, and breach insights</p>
        </div>
        <button
          onClick={runBreachScan}
          disabled={scanning || total === 0}
          className="btn btn-sm btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanning ? 'Scanning…' : 'Run Breach Scan'}
        </button>
      </div>

      <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{total}</div>
              <div className="text-xs text-slate-600">Total entries</div>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-700">{weakCount}</div>
              <div className="text-xs text-slate-600">Weak passwords</div>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-rose-700">{reusedPasswords}</div>
              <div className="text-xs text-slate-600">Reused passwords</div>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-red-700">{breachedCount}</div>
              <div className="text-xs text-slate-600">Breached (after scan)</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div className="px-3 pb-3 border-t border-slate-200">
          <div className="pt-3">
            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Intelligent Recommendations
              {isLoadingAI && (
                <span className="text-xs text-slate-500 ml-2">(AI analyzing...)</span>
              )}
              {aiRecommendations.length > 0 && !isLoadingAI && (
                <span className="text-xs text-secondary-600 ml-2">✨ AI Enhanced</span>
              )}
            </h4>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    rec.priority === 'high'
                      ? 'bg-red-50 border-red-200'
                      : rec.priority === 'medium'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      rec.priority === 'high'
                        ? 'bg-red-500'
                        : rec.priority === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}>
                      <span className="text-white text-xs font-bold">{rec.priority === 'high' ? '!' : rec.priority === 'medium' ? '•' : 'i'}</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${
                        rec.priority === 'high'
                          ? 'text-red-900'
                          : rec.priority === 'medium'
                          ? 'text-amber-900'
                          : 'text-blue-900'
                      }`}>
                        {rec.message}
                      </p>
                      {rec.action && (
                        <button className="mt-2 text-xs font-medium underline">
                          {rec.action} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="px-3 pb-3">
          <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Entry</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Strength</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Reuse</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Breached</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {entries.map(e => {
                  const strength = scorePasswordStrength(e.password)
                  const reused = (byPassword.get(e.password) || 0) > 1
                  const breachHits = getBreachFor(e.password)
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-secondary-500 to-secondary-400 rounded-md flex items-center justify-center">
                            <span className="text-white font-semibold text-xs">
                              {e.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-slate-900 truncate max-w-[120px]">{e.name}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[120px]">{e.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          strength.score >= 4 ? 'bg-green-100 text-green-700 border border-green-200' : 
                          strength.score >= 2 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                          'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {strength.score >= 4 ? 'Strong' : strength.score >= 2 ? 'Medium' : 'Weak'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {reused ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Reused
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-slate-500">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Unique
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {breachHits > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {breachHits.toLocaleString()} hits
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-slate-500">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {scanning ? 'Scanning…' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityAdvisor


