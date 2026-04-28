import type { TaskType, PerformanceProfile, ModelParameters, AutoTuneRecommendation } from './types'

export const taskTypeDescriptions: Record<TaskType, string> = {
  creative_writing: 'Generate creative content like stories, poems, and narratives',
  code_generation: 'Generate, review, and debug code across multiple programming languages',
  data_analysis: 'Analyze datasets, extract insights, and identify patterns',
  conversation: 'Natural dialogue and general-purpose chat interactions',
  summarization: 'Condense long text into concise summaries',
  translation: 'Translate text between languages',
  question_answering: 'Provide factual answers to specific questions',
  reasoning: 'Complex logical reasoning and problem-solving',
  instruction_following: 'Follow specific instructions and execute tasks precisely',
  brainstorming: 'Generate diverse ideas and creative solutions'
}

export const defaultProfilesByTaskType: Record<TaskType, ModelParameters> = {
  creative_writing: {
    temperature: 0.9,
    maxTokens: 2000,
    topP: 0.95,
    topK: 50,
    frequencyPenalty: 0.3,
    presencePenalty: 0.6,
    repeatPenalty: 1.15,
    minP: 0.05,
    typicalP: 0.92
  },
  code_generation: {
    temperature: 0.2,
    maxTokens: 3000,
    topP: 0.9,
    topK: 40,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    repeatPenalty: 1.0,
    minP: 0.1,
    typicalP: 0.95
  },
  data_analysis: {
    temperature: 0.3,
    maxTokens: 2500,
    topP: 0.9,
    topK: 30,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
    repeatPenalty: 1.05,
    minP: 0.08,
    typicalP: 0.93
  },
  conversation: {
    temperature: 0.7,
    maxTokens: 1500,
    topP: 0.9,
    topK: 40,
    frequencyPenalty: 0.2,
    presencePenalty: 0.3,
    repeatPenalty: 1.1,
    minP: 0.05,
    typicalP: 0.9
  },
  summarization: {
    temperature: 0.3,
    maxTokens: 1000,
    topP: 0.85,
    topK: 30,
    frequencyPenalty: 0.5,
    presencePenalty: 0.2,
    repeatPenalty: 1.2,
    minP: 0.1,
    typicalP: 0.95
  },
  translation: {
    temperature: 0.1,
    maxTokens: 2000,
    topP: 0.9,
    topK: 20,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    repeatPenalty: 1.0,
    minP: 0.15,
    typicalP: 0.98
  },
  question_answering: {
    temperature: 0.2,
    maxTokens: 1000,
    topP: 0.85,
    topK: 30,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
    repeatPenalty: 1.05,
    minP: 0.12,
    typicalP: 0.96
  },
  reasoning: {
    temperature: 0.4,
    maxTokens: 2500,
    topP: 0.9,
    topK: 40,
    frequencyPenalty: 0.0,
    presencePenalty: 0.1,
    repeatPenalty: 1.05,
    minP: 0.08,
    typicalP: 0.93
  },
  instruction_following: {
    temperature: 0.2,
    maxTokens: 2000,
    topP: 0.85,
    topK: 30,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    repeatPenalty: 1.0,
    minP: 0.1,
    typicalP: 0.95
  },
  brainstorming: {
    temperature: 1.0,
    maxTokens: 2000,
    topP: 0.98,
    topK: 60,
    frequencyPenalty: 0.4,
    presencePenalty: 0.7,
    repeatPenalty: 1.2,
    minP: 0.02,
    typicalP: 0.88
  }
}

export const taskTypeReasonings: Record<TaskType, string> = {
  creative_writing: 'High temperature and presence penalty encourage creativity and diverse vocabulary. Higher topP allows more creative token selection.',
  code_generation: 'Low temperature ensures deterministic, accurate code. No penalties to allow standard programming patterns and conventions.',
  data_analysis: 'Moderate temperature balances precision with insight generation. Low penalties maintain analytical consistency.',
  conversation: 'Balanced parameters for natural, engaging dialogue. Moderate penalties prevent repetitive responses.',
  summarization: 'Low temperature for accuracy, high frequency penalty to avoid redundancy, moderate max tokens for concise output.',
  translation: 'Very low temperature for accurate, consistent translations. No penalties to preserve linguistic patterns.',
  question_answering: 'Low temperature prioritizes factual accuracy. Moderate token limit for concise but complete answers.',
  reasoning: 'Moderate temperature allows exploratory thinking while maintaining logical coherence. Higher token limit for detailed reasoning chains.',
  instruction_following: 'Low temperature ensures precise execution of instructions. No penalties allow following exact patterns specified.',
  brainstorming: 'Maximum temperature and penalties for maximum diversity and creativity. High topP enables unconventional ideas.'
}

export function generateAutoTuneRecommendation(
  taskType: TaskType,
  currentParams: ModelParameters,
  _benchmarkData?: { avgQualityScore?: number; avgResponseTime?: number }
): AutoTuneRecommendation {
  const recommendedParams = defaultProfilesByTaskType[taskType]
  const reasoning = taskTypeReasonings[taskType]
  
  const tempDiff = Math.abs(currentParams.temperature - recommendedParams.temperature)
  const tokenDiff = Math.abs(currentParams.maxTokens - recommendedParams.maxTokens)
  const topPDiff = Math.abs(currentParams.topP - recommendedParams.topP)
  
  const totalDiff = tempDiff + (tokenDiff / 1000) + topPDiff
  const confidence = Math.max(0.5, Math.min(0.99, 1 - (totalDiff / 3)))
  
  const expectedImprovements: AutoTuneRecommendation['expectedImprovements'] = {}
  
  if (taskType === 'creative_writing' || taskType === 'brainstorming') {
    if (currentParams.temperature < recommendedParams.temperature) {
      expectedImprovements.creativity = 'More diverse and creative outputs'
    }
    if (currentParams.presencePenalty < recommendedParams.presencePenalty) {
      expectedImprovements.quality = 'Richer vocabulary and less repetition'
    }
  }
  
  if (taskType === 'code_generation' || taskType === 'translation' || taskType === 'instruction_following') {
    if (currentParams.temperature > recommendedParams.temperature) {
      expectedImprovements.consistency = 'More reliable and deterministic outputs'
    }
    expectedImprovements.quality = 'Higher accuracy and precision'
  }
  
  if (taskType === 'conversation') {
    expectedImprovements.quality = 'More natural and engaging dialogue'
  }
  
  if (taskType === 'summarization') {
    if (currentParams.frequencyPenalty < recommendedParams.frequencyPenalty) {
      expectedImprovements.quality = 'More concise without redundancy'
    }
  }
  
  if (taskType === 'reasoning' || taskType === 'data_analysis') {
    expectedImprovements.quality = 'Better analytical depth and logical coherence'
  }
  
  if (currentParams.maxTokens > recommendedParams.maxTokens) {
    expectedImprovements.speed = 'Faster response times'
  }
  
  return {
    taskType,
    currentParams,
    recommendedParams,
    reasoning,
    expectedImprovements,
    confidence
  }
}

export function createDefaultProfile(taskType: TaskType): Omit<PerformanceProfile, 'id' | 'createdAt'> {
  return {
    name: `${taskType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Profile`,
    taskType,
    description: taskTypeDescriptions[taskType],
    parameters: defaultProfilesByTaskType[taskType],
    reasoning: taskTypeReasonings[taskType],
    usageCount: 0
  }
}

export function analyzeParameterImpact(
  paramName: keyof ModelParameters,
  value: number,
  _taskType: TaskType
): string {
  if (paramName === 'temperature') {
    if (value < 0.3) return 'Very deterministic - best for factual tasks'
    if (value < 0.5) return 'Moderately focused - good for analytical tasks'
    if (value < 0.7) return 'Balanced - suitable for conversation'
    if (value < 0.9) return 'Creative - good for diverse outputs'
    return 'Highly creative - maximum diversity'
  }
  
  if (paramName === 'topP') {
    if (value < 0.85) return 'Conservative token selection - higher consistency'
    if (value < 0.95) return 'Balanced token selection - good quality'
    return 'Diverse token selection - more creativity'
  }
  
  if (paramName === 'frequencyPenalty') {
    if (value === 0) return 'No penalty - allows repetition'
    if (value < 0.3) return 'Light penalty - subtle repetition reduction'
    if (value < 0.6) return 'Moderate penalty - balanced output'
    return 'Strong penalty - minimal repetition'
  }
  
  if (paramName === 'presencePenalty') {
    if (value === 0) return 'No penalty - natural token distribution'
    if (value < 0.3) return 'Light penalty - slight vocabulary expansion'
    if (value < 0.6) return 'Moderate penalty - diverse vocabulary'
    return 'Strong penalty - maximum topic diversity'
  }
  
  if (paramName === 'maxTokens') {
    if (value < 500) return 'Short responses - concise answers'
    if (value < 1500) return 'Medium responses - balanced detail'
    if (value < 3000) return 'Long responses - comprehensive answers'
    return 'Very long responses - detailed explanations'
  }
  
  if (paramName === 'topK') {
    if (value < 20) return 'Very selective - highest quality tokens only'
    if (value < 40) return 'Selective - good balance'
    if (value < 60) return 'Permissive - more variety'
    return 'Very permissive - maximum variety'
  }
  
  return 'Standard setting'
}

export function scoreProfileMatch(
  params: ModelParameters,
  taskType: TaskType
): number {
  const ideal = defaultProfilesByTaskType[taskType]
  
  const tempScore = 1 - Math.min(1, Math.abs(params.temperature - ideal.temperature) / 1)
  const topPScore = 1 - Math.min(1, Math.abs(params.topP - ideal.topP) / 0.5)
  const freqScore = 1 - Math.min(1, Math.abs(params.frequencyPenalty - ideal.frequencyPenalty) / 1)
  const presScore = 1 - Math.min(1, Math.abs(params.presencePenalty - ideal.presencePenalty) / 1)
  const tokenScore = 1 - Math.min(1, Math.abs(params.maxTokens - ideal.maxTokens) / 2000)
  
  return (tempScore * 0.3 + topPScore * 0.2 + freqScore * 0.2 + presScore * 0.15 + tokenScore * 0.15) * 100
}
