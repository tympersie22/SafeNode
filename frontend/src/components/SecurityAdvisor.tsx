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
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Security Advisor</h3>
          <p className="text-sm text-slate-600">Strength, reuse, and breach insights</p>
        </div>
        <button
          onClick={runBreachScan}
          disabled={scanning || total === 0}
          className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {scanning ? 'Scanning…' : 'Run Breach Scan'}
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">{total}</div>
          <div className="text-sm text-slate-600">Total entries</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-2xl font-bold text-amber-700">{weakCount}</div>
          <div className="text-sm text-slate-600">Weak passwords</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-2xl font-bold text-rose-700">{reusedPasswords}</div>
          <div className="text-sm text-slate-600">Reused passwords</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-2xl font-bold text-red-700">{breachedCount}</div>
          <div className="text-sm text-slate-600">Breached (after scan)</div>
        </div>
      </div>

      {total > 0 && (
        <div className="px-4 pb-4">
          <div className="overflow-hidden border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Entry</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Strength</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Reuse</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Breached</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {entries.map(e => {
                  const strength = scorePasswordStrength(e.password)
                  const reused = (byPassword.get(e.password) || 0) > 1
                  const breachHits = getBreachFor(e.password)
                  return (
                    <tr key={e.id}>
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium text-slate-900">{e.name}</div>
                        <div className="text-xs text-slate-600">{e.username}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                          strength.score >= 4 ? 'bg-green-100 text-green-700' : strength.score >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {strength.score >= 4 ? 'Strong' : strength.score >= 2 ? 'Medium' : 'Weak'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {reused ? (
                          <span className="inline-flex px-2 py-1 rounded text-xs bg-rose-100 text-rose-700">Reused</span>
                        ) : (
                          <span className="text-xs text-slate-500">Unique</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {breachHits > 0 ? (
                          <span className="inline-flex px-2 py-1 rounded text-xs bg-red-100 text-red-700">{breachHits.toLocaleString()} hits</span>
                        ) : (
                          <span className="text-xs text-slate-500">{scanning ? 'Scanning…' : '—'}</span>
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


