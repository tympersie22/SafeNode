import React from 'react'
import { getPasswordBreachCount } from '../crypto/crypto'

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
                          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md flex items-center justify-center">
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


