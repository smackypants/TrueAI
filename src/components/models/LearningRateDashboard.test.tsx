import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LearningRateDashboard } from './LearningRateDashboard'
import type { FineTuningJob } from '@/lib/types'

// Component renders an empty-state card ("No Fine-Tuning Jobs") when
// fineTuningJobs is empty. Seed at least one running job so the main
// dashboard heading is rendered.
const sampleJob: FineTuningJob = {
  id: 'job-1',
  modelId: 'model-1',
  datasetId: 'dataset-1',
  status: 'running',
  progress: 50,
  epochs: 3,
  learningRate: 0.0001,
  batchSize: 8,
  startedAt: Date.now() - 60_000,
}

describe('LearningRateDashboard', () => {
  it('renders heading when there are fine-tuning jobs', () => {
    render(
      <LearningRateDashboard
        models={[]}
        fineTuningJobs={[sampleJob]}
        onUpdateJobLearningRate={vi.fn()}
      />
    )
    expect(
      screen.getByRole('heading', { name: /learning rate fine-tuning/i })
    ).toBeInTheDocument()
  })

  it('renders empty state when no jobs', () => {
    render(
      <LearningRateDashboard
        models={[]}
        fineTuningJobs={[]}
        onUpdateJobLearningRate={vi.fn()}
      />
    )
    expect(screen.getByText(/no fine-tuning jobs/i)).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    render(
      <LearningRateDashboard
        models={[]}
        fineTuningJobs={[]}
        onUpdateJobLearningRate={vi.fn()}
      />
    )
    expect(document.body).toBeTruthy()
  })
})
