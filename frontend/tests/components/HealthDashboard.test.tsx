/**
 * Health Dashboard Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HealthDashboard } from '../../src/components/HealthDashboard'
import type { VaultEntry } from '../../src/types/vault'
import type { PasswordHealthSummary } from '../../src/health/passwordHealth'

describe('HealthDashboard', () => {
  const mockEntries: VaultEntry[] = [
    {
      id: '1',
      name: 'Test Entry',
      category: 'password',
      username: 'test@example.com',
      password: 'WeakPass123',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ]

  const mockHealthSummary: PasswordHealthSummary = {
    score: 75,
    totalEntries: 1,
    strongCount: 0,
    weakCount: 1,
    reusedCount: 0,
    compromisedCount: 0,
    issues: [
      {
        type: 'weak',
        entryId: '1',
        entryName: 'Test Entry',
        severity: 'medium',
        message: 'Password can be stronger'
      }
    ]
  }

  it('should render health dashboard with summary', () => {
    render(
      <HealthDashboard
        entries={mockEntries}
        healthSummary={mockHealthSummary}
      />
    )

    expect(screen.getByText('Password Health')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('should show empty state when no summary', () => {
    render(
      <HealthDashboard
        entries={[]}
        healthSummary={null}
      />
    )

    expect(screen.getByText(/Add password entries to see health analysis/i)).toBeInTheDocument()
  })
})

