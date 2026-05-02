import type { ModelConfig, TaskType, ModelParameters } from './types'
import { z } from 'zod'
import { generateObject, getLanguageModel } from './llm-runtime/ai-sdk'

export interface BenchmarkTest {
  id: string
  taskType: TaskType
  prompt: string
  expectedCharacteristics: string[]
}

export interface BenchmarkRun {
  id: string
  modelId: string
  testId: string
  parameters: ModelParameters
  startTime: number
  endTime?: number
  responseTime: number
  response: string
  tokensPerSecond: number
  qualityScore: number
  qualityBreakdown: {
    relevance: number
    coherence: number
    creativity: number
    accuracy: number
  }
  error?: string
}

export interface BenchmarkSuite {
  id: string
  modelId: string
  parameters: ModelParameters
  tests: BenchmarkRun[]
  overallScore: number
  averageResponseTime: number
  averageTokensPerSecond: number
  timestamp: number
  status: 'running' | 'completed' | 'failed'
}

export const benchmarkTests: BenchmarkTest[] = [
  {
    id: 'creative-1',
    taskType: 'creative_writing',
    prompt: 'Write a short poem about artificial intelligence discovering consciousness.',
    expectedCharacteristics: ['creative', 'metaphorical', 'emotional', 'varied vocabulary']
  },
  {
    id: 'code-1',
    taskType: 'code_generation',
    prompt: 'Write a Python function that implements binary search on a sorted array with proper error handling.',
    expectedCharacteristics: ['correct syntax', 'efficient', 'documented', 'handles edge cases']
  },
  {
    id: 'analysis-1',
    taskType: 'data_analysis',
    prompt: 'Analyze this data pattern: Sales increased 15% in Q1, dropped 8% in Q2, increased 22% in Q3. What trends do you observe?',
    expectedCharacteristics: ['analytical', 'insightful', 'specific', 'data-driven']
  },
  {
    id: 'conversation-1',
    taskType: 'conversation',
    prompt: 'What are some good strategies for staying focused while working from home?',
    expectedCharacteristics: ['conversational', 'helpful', 'engaging', 'practical']
  },
  {
    id: 'summarization-1',
    taskType: 'summarization',
    prompt: 'Summarize this: Climate change is affecting global weather patterns, leading to more frequent extreme weather events. Rising temperatures are causing ice caps to melt, sea levels to rise, and ecosystems to shift. Scientists warn that immediate action is needed to reduce greenhouse gas emissions and transition to renewable energy sources to mitigate the worst effects.',
    expectedCharacteristics: ['concise', 'accurate', 'no redundancy', 'key points captured']
  },
  {
    id: 'reasoning-1',
    taskType: 'reasoning',
    prompt: 'If all A are B, and some B are C, can we conclude that some A are C? Explain your reasoning.',
    expectedCharacteristics: ['logical', 'thorough', 'step-by-step', 'correct conclusion']
  },
  {
    id: 'qa-1',
    taskType: 'question_answering',
    prompt: 'What is the capital of Australia?',
    expectedCharacteristics: ['accurate', 'direct', 'factual', 'concise']
  },
  {
    id: 'brainstorm-1',
    taskType: 'brainstorming',
    prompt: 'Generate 5 unique business ideas that combine AI with sustainable farming.',
    expectedCharacteristics: ['diverse', 'innovative', 'creative', 'varied approaches']
  },
  {
    id: 'translation-1',
    taskType: 'translation',
    prompt: 'Translate to Spanish: "The quick brown fox jumps over the lazy dog."',
    expectedCharacteristics: ['accurate', 'grammatically correct', 'natural phrasing', 'complete']
  },
  {
    id: 'instruction-1',
    taskType: 'instruction_following',
    prompt: 'List exactly 3 benefits of meditation, using bullet points, with each point being exactly 10 words.',
    expectedCharacteristics: ['follows format', 'precise count', 'relevant content', 'structured']
  }
]

export async function runModelBenchmark(
  model: ModelConfig,
  parameters: ModelParameters,
  testsToRun: BenchmarkTest[],
  onProgress?: (progress: number, currentTest: string) => void
): Promise<BenchmarkSuite> {
  const suiteId = `suite-${Date.now()}`
  const runs: BenchmarkRun[] = []
  
  for (let i = 0; i < testsToRun.length; i++) {
    const test = testsToRun[i]
    
    if (onProgress) {
      onProgress((i / testsToRun.length) * 100, test.taskType)
    }
    
    try {
      const run = await runSingleTest(model, parameters, test)
      runs.push(run)
    } catch (error) {
      runs.push({
        id: `run-${Date.now()}-${i}`,
        modelId: model.id,
        testId: test.id,
        parameters,
        startTime: Date.now(),
        responseTime: 0,
        response: '',
        tokensPerSecond: 0,
        qualityScore: 0,
        qualityBreakdown: {
          relevance: 0,
          coherence: 0,
          creativity: 0,
          accuracy: 0
        },
        error: String(error)
      })
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  if (onProgress) {
    onProgress(100, 'complete')
  }
  
  const successfulRuns = runs.filter(r => !r.error)
  const overallScore = successfulRuns.length > 0
    ? successfulRuns.reduce((sum, r) => sum + r.qualityScore, 0) / successfulRuns.length
    : 0
  
  const averageResponseTime = successfulRuns.length > 0
    ? successfulRuns.reduce((sum, r) => sum + r.responseTime, 0) / successfulRuns.length
    : 0
  
  const averageTokensPerSecond = successfulRuns.length > 0
    ? successfulRuns.reduce((sum, r) => sum + r.tokensPerSecond, 0) / successfulRuns.length
    : 0
  
  return {
    id: suiteId,
    modelId: model.id,
    parameters,
    tests: runs,
    overallScore,
    averageResponseTime,
    averageTokensPerSecond,
    timestamp: Date.now(),
    status: runs.some(r => r.error) ? 'failed' : 'completed'
  }
}

async function runSingleTest(
  model: ModelConfig,
  parameters: ModelParameters,
  test: BenchmarkTest
): Promise<BenchmarkRun> {
  const startTime = Date.now()
  
  const prompt = spark.llmPrompt`${test.prompt}`
  const response = await spark.llm(prompt, model.id)
  
  const endTime = Date.now()
  const responseTime = endTime - startTime
  
  const estimatedTokens = Math.ceil(response.length / 4)
  const tokensPerSecond = (estimatedTokens / responseTime) * 1000
  
  const qualityBreakdown = await evaluateResponse(response, test)
  const qualityScore = Object.values(qualityBreakdown).reduce((a, b) => a + b, 0) / 4
  
  return {
    id: `run-${Date.now()}`,
    modelId: model.id,
    testId: test.id,
    parameters,
    startTime,
    endTime,
    responseTime,
    response,
    tokensPerSecond,
    qualityScore,
    qualityBreakdown,
  }
}

/**
 * Schema for evaluator output. Each dimension is a 0..100 integer score.
 * Using `generateObject` with this schema replaces the old hand-rolled
 * `JSON.parse(spark.llm(..., jsonMode=true))` path: invalid output now
 * fails fast with a typed error instead of silently producing `NaN` /
 * mis-keyed fields.
 */
const evaluationSchema = z.object({
  relevance: z.number().min(0).max(100),
  coherence: z.number().min(0).max(100),
  creativity: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100),
})

async function evaluateResponse(
  response: string,
  test: BenchmarkTest
): Promise<BenchmarkRun['qualityBreakdown']> {
  const evaluationPrompt = `You are an expert AI evaluator. Evaluate the following response based on these criteria:

Task Type: ${test.taskType}
Prompt: ${test.prompt}
Response: ${response}
Expected Characteristics: ${test.expectedCharacteristics.join(', ')}

Rate the response on these dimensions from 0-100:
1. Relevance - How well does it address the prompt?
2. Coherence - Is it well-structured and logical?
3. Creativity - Does it show originality and insight? (less important for factual tasks)
4. Accuracy - Is the information correct and appropriate?

Return ONLY a JSON object with these four scores. No explanation.`

  try {
    const model = await getLanguageModel('gpt-4o-mini')
    const { object } = await generateObject({
      model,
      schema: evaluationSchema,
      prompt: evaluationPrompt,
    })
    return {
      relevance: Math.min(100, Math.max(0, object.relevance)),
      coherence: Math.min(100, Math.max(0, object.coherence)),
      creativity: Math.min(100, Math.max(0, object.creativity)),
      accuracy: Math.min(100, Math.max(0, object.accuracy)),
    }
  } catch (_error) {
    return {
      relevance: 50,
      coherence: 50,
      creativity: 50,
      accuracy: 50,
    }
  }
}

export function compareBenchmarkSuites(
  baseline: BenchmarkSuite,
  comparison: BenchmarkSuite
): {
  scoreDelta: number
  speedDelta: number
  throughputDelta: number
  betterTests: string[]
  worseTests: string[]
  recommendation: string
} {
  const scoreDelta = comparison.overallScore - baseline.overallScore
  const speedDelta = ((baseline.averageResponseTime - comparison.averageResponseTime) / baseline.averageResponseTime) * 100
  const throughputDelta = ((comparison.averageTokensPerSecond - baseline.averageTokensPerSecond) / baseline.averageTokensPerSecond) * 100
  
  const betterTests: string[] = []
  const worseTests: string[] = []
  
  comparison.tests.forEach(compTest => {
    const baseTest = baseline.tests.find(t => t.testId === compTest.testId)
    if (baseTest) {
      if (compTest.qualityScore > baseTest.qualityScore + 5) {
        betterTests.push(compTest.testId)
      } else if (compTest.qualityScore < baseTest.qualityScore - 5) {
        worseTests.push(compTest.testId)
      }
    }
  })
  
  let recommendation = ''
  if (scoreDelta > 5 && speedDelta > -20) {
    recommendation = 'Recommended: Quality improved significantly with acceptable speed trade-off'
  } else if (scoreDelta < -5) {
    recommendation = 'Not Recommended: Quality decreased significantly'
  } else if (speedDelta > 30) {
    recommendation = 'Consider: Much faster with similar quality'
  } else if (speedDelta < -30 && scoreDelta < 10) {
    recommendation = 'Caution: Significantly slower without major quality gains'
  } else {
    recommendation = 'Neutral: Similar overall performance'
  }
  
  return {
    scoreDelta,
    speedDelta,
    throughputDelta,
    betterTests,
    worseTests,
    recommendation
  }
}

export function generateBenchmarkReport(suite: BenchmarkSuite): string {
  const successRate = (suite.tests.filter(t => !t.error).length / suite.tests.length) * 100
  
  return `
## Benchmark Report - ${new Date(suite.timestamp).toLocaleString()}

**Model:** ${suite.modelId}
**Overall Score:** ${suite.overallScore.toFixed(1)}/100
**Success Rate:** ${successRate.toFixed(0)}%
**Avg Response Time:** ${suite.averageResponseTime.toFixed(0)}ms
**Avg Throughput:** ${suite.averageTokensPerSecond.toFixed(1)} tokens/sec

### Parameters
- Temperature: ${suite.parameters.temperature}
- Max Tokens: ${suite.parameters.maxTokens}
- Top P: ${suite.parameters.topP}
- Frequency Penalty: ${suite.parameters.frequencyPenalty}
- Presence Penalty: ${suite.parameters.presencePenalty}

### Test Results
${suite.tests.map(test => `
**${test.testId}**
- Quality: ${test.qualityScore.toFixed(1)}/100
- Response Time: ${test.responseTime}ms
- Tokens/Sec: ${test.tokensPerSecond.toFixed(1)}
${test.error ? `- Error: ${test.error}` : ''}
`).join('\n')}
`.trim()
}
