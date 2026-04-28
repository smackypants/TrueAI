import { describe, it, expect } from 'vitest'
import {
  taskTypeDescriptions,
  defaultProfilesByTaskType,
  taskTypeReasonings,
  generateAutoTuneRecommendation,
  createDefaultProfile,
  analyzeParameterImpact,
  scoreProfileMatch,
} from './performance-profiles'
import type { TaskType, ModelParameters } from './types'

const TASK_TYPES: TaskType[] = [
  'creative_writing',
  'code_generation',
  'data_analysis',
  'conversation',
  'summarization',
  'translation',
  'question_answering',
  'reasoning',
  'instruction_following',
  'brainstorming',
]

describe('performance-profiles: static maps', () => {
  it('provides a description, reasoning, and default params for every task type', () => {
    for (const t of TASK_TYPES) {
      expect(taskTypeDescriptions[t]).toEqual(expect.any(String))
      expect(taskTypeReasonings[t]).toEqual(expect.any(String))
      expect(defaultProfilesByTaskType[t]).toBeDefined()
      expect(defaultProfilesByTaskType[t].temperature).toBeGreaterThanOrEqual(0)
      expect(defaultProfilesByTaskType[t].maxTokens).toBeGreaterThan(0)
    }
  })
})

describe('createDefaultProfile', () => {
  it('returns a profile keyed to the task type with usageCount 0', () => {
    const profile = createDefaultProfile('code_generation')
    expect(profile).toMatchObject({
      taskType: 'code_generation',
      description: taskTypeDescriptions.code_generation,
      parameters: defaultProfilesByTaskType.code_generation,
      reasoning: taskTypeReasonings.code_generation,
      usageCount: 0,
    })
  })

  it('formats the profile name from the task type', () => {
    expect(createDefaultProfile('creative_writing').name).toBe('Creative Writing Profile')
    expect(createDefaultProfile('question_answering').name).toBe('Question Answering Profile')
    expect(createDefaultProfile('reasoning').name).toBe('Reasoning Profile')
  })
})

describe('generateAutoTuneRecommendation', () => {
  it('echoes the recommended params and reasoning for the task type', () => {
    const current: ModelParameters = {
      temperature: 0.5,
      maxTokens: 1500,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
    }
    const rec = generateAutoTuneRecommendation('code_generation', current)
    expect(rec.taskType).toBe('code_generation')
    expect(rec.currentParams).toBe(current)
    expect(rec.recommendedParams).toBe(defaultProfilesByTaskType.code_generation)
    expect(rec.reasoning).toBe(taskTypeReasonings.code_generation)
  })

  it('produces a confidence in [0.5, 0.99]', () => {
    const wayOff: ModelParameters = {
      temperature: 1.5,
      maxTokens: 10000,
      topP: 0.1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    }
    const matches: ModelParameters = { ...defaultProfilesByTaskType.conversation }
    expect(generateAutoTuneRecommendation('conversation', wayOff).confidence).toBeGreaterThanOrEqual(0.5)
    expect(generateAutoTuneRecommendation('conversation', wayOff).confidence).toBeLessThanOrEqual(0.99)
    expect(generateAutoTuneRecommendation('conversation', matches).confidence).toBeCloseTo(0.99, 5)
  })

  it('suggests creativity / quality improvements for creative_writing when temp is too low', () => {
    const current: ModelParameters = {
      temperature: 0.2,
      maxTokens: 2000,
      topP: 0.95,
      frequencyPenalty: 0.3,
      presencePenalty: 0.1, // below recommended 0.6
    }
    const rec = generateAutoTuneRecommendation('creative_writing', current)
    expect(rec.expectedImprovements.creativity).toBeDefined()
    expect(rec.expectedImprovements.quality).toBeDefined()
  })

  it('suggests consistency + quality for code_generation when temp is too high', () => {
    const current: ModelParameters = {
      temperature: 0.9,
      maxTokens: 3000,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
    }
    const rec = generateAutoTuneRecommendation('code_generation', current)
    expect(rec.expectedImprovements.consistency).toBeDefined()
    expect(rec.expectedImprovements.quality).toBeDefined()
  })

  it('always reports quality improvement for conversation', () => {
    const rec = generateAutoTuneRecommendation('conversation', defaultProfilesByTaskType.conversation)
    expect(rec.expectedImprovements.quality).toBeDefined()
  })

  it('reports quality improvement for summarization when frequency penalty is too low', () => {
    const current: ModelParameters = {
      ...defaultProfilesByTaskType.summarization,
      frequencyPenalty: 0,
    }
    const rec = generateAutoTuneRecommendation('summarization', current)
    expect(rec.expectedImprovements.quality).toBeDefined()
  })

  it('reports speed improvement when current maxTokens exceeds the recommendation', () => {
    const current: ModelParameters = {
      ...defaultProfilesByTaskType.translation,
      maxTokens: 5000,
    }
    const rec = generateAutoTuneRecommendation('translation', current)
    expect(rec.expectedImprovements.speed).toBe('Faster response times')
  })
})

describe('analyzeParameterImpact', () => {
  it('describes temperature ranges', () => {
    expect(analyzeParameterImpact('temperature', 0.1, 'reasoning')).toMatch(/deterministic/i)
    expect(analyzeParameterImpact('temperature', 0.4, 'reasoning')).toMatch(/focused/i)
    expect(analyzeParameterImpact('temperature', 0.6, 'reasoning')).toMatch(/balanced/i)
    expect(analyzeParameterImpact('temperature', 0.8, 'reasoning')).toMatch(/creative/i)
    expect(analyzeParameterImpact('temperature', 1.0, 'reasoning')).toMatch(/highly creative/i)
  })

  it('describes topP ranges', () => {
    expect(analyzeParameterImpact('topP', 0.8, 'reasoning')).toMatch(/conservative/i)
    expect(analyzeParameterImpact('topP', 0.9, 'reasoning')).toMatch(/balanced/i)
    expect(analyzeParameterImpact('topP', 0.97, 'reasoning')).toMatch(/diverse/i)
  })

  it('describes frequencyPenalty ranges', () => {
    expect(analyzeParameterImpact('frequencyPenalty', 0, 'reasoning')).toMatch(/no penalty/i)
    expect(analyzeParameterImpact('frequencyPenalty', 0.2, 'reasoning')).toMatch(/light/i)
    expect(analyzeParameterImpact('frequencyPenalty', 0.5, 'reasoning')).toMatch(/moderate/i)
    expect(analyzeParameterImpact('frequencyPenalty', 0.9, 'reasoning')).toMatch(/strong/i)
  })

  it('describes presencePenalty ranges', () => {
    expect(analyzeParameterImpact('presencePenalty', 0, 'reasoning')).toMatch(/no penalty/i)
    expect(analyzeParameterImpact('presencePenalty', 0.2, 'reasoning')).toMatch(/light/i)
    expect(analyzeParameterImpact('presencePenalty', 0.5, 'reasoning')).toMatch(/moderate/i)
    expect(analyzeParameterImpact('presencePenalty', 0.9, 'reasoning')).toMatch(/strong/i)
  })

  it('describes maxTokens ranges', () => {
    expect(analyzeParameterImpact('maxTokens', 200, 'reasoning')).toMatch(/short/i)
    expect(analyzeParameterImpact('maxTokens', 1000, 'reasoning')).toMatch(/medium/i)
    expect(analyzeParameterImpact('maxTokens', 2000, 'reasoning')).toMatch(/long/i)
    expect(analyzeParameterImpact('maxTokens', 4000, 'reasoning')).toMatch(/very long/i)
  })

  it('describes topK ranges', () => {
    expect(analyzeParameterImpact('topK', 10, 'reasoning')).toMatch(/very selective/i)
    expect(analyzeParameterImpact('topK', 30, 'reasoning')).toMatch(/selective/i)
    expect(analyzeParameterImpact('topK', 50, 'reasoning')).toMatch(/permissive/i)
    expect(analyzeParameterImpact('topK', 80, 'reasoning')).toMatch(/very permissive/i)
  })

  it('returns the standard fallback for unrecognised parameters', () => {
    expect(analyzeParameterImpact('repeatPenalty', 1, 'reasoning')).toBe('Standard setting')
  })
})

describe('scoreProfileMatch', () => {
  it('scores an exact match at 100', () => {
    expect(scoreProfileMatch(defaultProfilesByTaskType.conversation, 'conversation')).toBeCloseTo(100, 5)
  })

  it('scores a wildly off profile noticeably lower than an exact one', () => {
    const off: ModelParameters = {
      temperature: 1.5,
      maxTokens: 10000,
      topP: 0.1,
      frequencyPenalty: 1,
      presencePenalty: 1,
    }
    const offScore = scoreProfileMatch(off, 'translation')
    const exactScore = scoreProfileMatch(defaultProfilesByTaskType.translation, 'translation')
    expect(offScore).toBeLessThan(exactScore)
    expect(offScore).toBeGreaterThanOrEqual(0)
    expect(offScore).toBeLessThanOrEqual(100)
  })
})
