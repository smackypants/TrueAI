import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DEFAULT_THRESHOLDS } from '@/lib/confidence-thresholds'

const { mockThresholdLearning } = vi.hoisted(() => ({
  mockThresholdLearning: {
    getMetrics: vi.fn().mockResolvedValue(null),
    getThresholdAdjustments: vi.fn().mockResolvedValue([]),
    getLearningStats: vi.fn().mockResolvedValue(null),
    learn: vi.fn().mockResolvedValue(undefined),
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(true),
  },
}))

vi.mock('@/lib/threshold-learning', () => ({
  thresholdLearning: mockThresholdLearning,
}))

import { LearningDashboard } from './LearningDashboard'

describe('LearningDashboard', () => {
  it('renders heading', () => {
    render(
      <LearningDashboard
        thresholdConfig={DEFAULT_THRESHOLDS}
        onThresholdConfigChange={vi.fn()}
      />
    )
    expect(screen.getByText(/adaptive learning system/i)).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    render(
      <LearningDashboard
        thresholdConfig={DEFAULT_THRESHOLDS}
        onThresholdConfigChange={vi.fn()}
      />
    )
    expect(document.body).toBeTruthy()
  })
})
