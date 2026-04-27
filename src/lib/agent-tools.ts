import type { AgentTool } from './types'

export interface ToolResult {
  success: boolean
  output: string
  error?: string
  metadata?: Record<string, unknown>
}

export class AgentToolExecutor {
  async executeTool(tool: AgentTool, input: string): Promise<ToolResult> {
    try {
      switch (tool) {
        case 'calculator':
          return this.executeCalculator(input)
        case 'datetime':
          return this.executeDatetime(input)
        case 'memory':
          return this.executeMemory(input)
        case 'web_search':
          return this.executeWebSearch(input)
        case 'code_interpreter':
          return this.executeCodeInterpreter(input)
        case 'file_reader':
          return this.executeFileReader(input)
        case 'json_parser':
          return this.executeJsonParser(input)
        case 'api_caller':
          return this.executeApiCaller(input)
        case 'data_analyzer':
          return this.executeDataAnalyzer(input)
        case 'image_generator':
          return this.executeImageGenerator(input)
        case 'sentiment_analyzer':
          return this.executeSentimentAnalyzer(input)
        case 'summarizer':
          return this.executeSummarizer(input)
        case 'translator':
          return this.executeTranslator(input)
        case 'validator':
          return this.executeValidator(input)
        default:
          return {
            success: false,
            output: `Unknown tool: ${tool}`
          }
      }
    } catch (_error) {
      return {
        success: false,
        output: _error instanceof Error ? _error.message : String(_error)
      }
    }
  }

  private executeCalculator(input: string): ToolResult {
    try {
      // Remove all non-math characters for safety
      const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '')

      // Use Function constructor with strict validation instead of eval
      // This is safer as it doesn't have access to the local scope
      const result = this.safeEvaluateExpression(sanitizedInput)

      return {
        success: true,
        output: `Result: ${result}`,
        metadata: { expression: sanitizedInput, result }
      }
    } catch (_error) {
      return {
        success: false,
        output: 'Invalid mathematical expression'
      }
    }
  }

  private safeEvaluateExpression(expr: string): number {
    // Validate that the expression only contains safe characters
    if (!/^[\d+\-*/().\s]+$/.test(expr)) {
      throw new Error('Invalid characters in expression')
    }

    // Check for balanced parentheses
    let depth = 0
    for (const char of expr) {
      if (char === '(') depth++
      if (char === ')') depth--
      if (depth < 0) throw new Error('Unbalanced parentheses')
    }
    if (depth !== 0) throw new Error('Unbalanced parentheses')

    // Use Function constructor in strict mode (safer than eval)
    // It doesn't have access to the local scope
    const fn = new Function('return (' + expr + ')')
    const result = fn()

    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result')
    }

    return result
  }

  private executeDatetime(input: string): ToolResult {
    const now = new Date()
    const operations: Record<string, string> = {
      'current': now.toLocaleString(),
      'date': now.toLocaleDateString(),
      'time': now.toLocaleTimeString(),
      'iso': now.toISOString(),
      'timestamp': now.getTime().toString(),
      'year': now.getFullYear().toString(),
      'month': (now.getMonth() + 1).toString(),
      'day': now.getDate().toString(),
      'weekday': now.toLocaleDateString('en-US', { weekday: 'long' })
    }

    const operation = input.toLowerCase().trim()
    const result = operations[operation] || operations['current']

    return {
      success: true,
      output: `Current ${operation}: ${result}`,
      metadata: { operation, timestamp: now.getTime() }
    }
  }

  private async executeMemory(input: string): Promise<ToolResult> {
    const command = input.toLowerCase().trim()
    
    if (command.startsWith('store:')) {
      const data = command.replace('store:', '').trim()
      const key = `agent-memory-${Date.now()}`
      await spark.kv.set(key, data)

      // Maintain an index of memory keys so `recall` can find them, since
      // spark.kv doesn't expose a keys() method. Cap the index to avoid
      // unbounded growth.
      const MAX_INDEX_SIZE = 100
      const memoryIndex = await spark.kv.get<string[]>('agent-memory-index') || []
      const updatedIndex = [...memoryIndex, key].slice(-MAX_INDEX_SIZE)
      await spark.kv.set('agent-memory-index', updatedIndex)

      return {
        success: true,
        output: 'Data stored in memory successfully',
        metadata: { action: 'store', dataLength: data.length }
      }
    } else if (command === 'recall') {
      // Note: spark.kv doesn't expose a keys() method, so we'll store memory indices
      const memoryIndex = await spark.kv.get<string[]>('agent-memory-index') || []
      const memories: string[] = []

      for (const key of memoryIndex.slice(-5)) {
        const data = await spark.kv.get<string>(key)
        if (data) memories.push(data)
      }
      
      return {
        success: true,
        output: `Retrieved ${memories.length} memory entries: ${memories.join(', ')}`,
        metadata: { action: 'recall', count: memories.length }
      }
    }

    return {
      success: false,
      output: 'Invalid memory command. Use "store: <data>" or "recall"'
    }
  }

  private executeWebSearch(input: string): ToolResult {
    const query = input.trim()
    const simulatedResults = [
      `Found information about "${query}" in recent documentation`,
      `Top result: "${query}" refers to modern AI capabilities`,
      `Related topics: machine learning, neural networks, automation`
    ]

    return {
      success: true,
      output: simulatedResults.join('\n'),
      metadata: { query, resultsCount: simulatedResults.length }
    }
  }

  private executeCodeInterpreter(_input: string): ToolResult {
    // Code execution is inherently dangerous and should be disabled
    // in production environments or heavily sandboxed
    return {
      success: false,
      output: 'Code execution has been disabled for security reasons. Please use safe alternatives like the calculator tool for mathematical expressions.'
    }
  }

  private executeFileReader(input: string): ToolResult {
    return {
      success: true,
      output: `Simulated file read from: ${input}. Content: Sample data from file.`,
      metadata: { filename: input, size: 1024 }
    }
  }

  private executeJsonParser(input: string): ToolResult {
    try {
      const parsed = JSON.parse(input)
      const summary = `Parsed JSON with ${Object.keys(parsed).length} top-level keys: ${Object.keys(parsed).join(', ')}`
      
      return {
        success: true,
        output: summary,
        metadata: { parsed, keyCount: Object.keys(parsed).length }
      }
    } catch (_error) {
      return {
        success: false,
        output: 'Invalid JSON format'
      }
    }
  }

  private async executeApiCaller(input: string): Promise<ToolResult> {
    return {
      success: true,
      output: `API call to ${input} completed. Status: 200. Response: {"status": "success"}`,
      metadata: { url: input, status: 200, responseTime: 120 }
    }
  }

  private async executeDataAnalyzer(input: string): Promise<ToolResult> {
    try {
      const data = JSON.parse(input)
      let analysis = ''
      
      if (Array.isArray(data)) {
        const numbers = data.filter(d => typeof d === 'number')
        if (numbers.length > 0) {
          const sum = numbers.reduce((a, b) => a + b, 0)
          const avg = sum / numbers.length
          const max = Math.max(...numbers)
          const min = Math.min(...numbers)
          
          analysis = `Analyzed ${numbers.length} numbers. Average: ${avg.toFixed(2)}, Max: ${max}, Min: ${min}, Sum: ${sum}`
        } else {
          analysis = `Array contains ${data.length} items of mixed types`
        }
      } else if (typeof data === 'object') {
        analysis = `Object has ${Object.keys(data).length} properties: ${Object.keys(data).join(', ')}`
      }

      return {
        success: true,
        output: analysis,
        metadata: { dataType: Array.isArray(data) ? 'array' : typeof data }
      }
    } catch {
      return {
        success: false,
        output: 'Invalid data format for analysis'
      }
    }
  }

  private executeImageGenerator(input: string): ToolResult {
    return {
      success: true,
      output: `Generated image with prompt: "${input}". Image URL: /generated-images/img-${Date.now()}.png`,
      metadata: { prompt: input, format: 'png', dimensions: '512x512' }
    }
  }

  private async executeSentimentAnalyzer(input: string): Promise<ToolResult> {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy']
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'hate', 'sad', 'disappointing']
    
    const lowerInput = input.toLowerCase()
    let positiveCount = 0
    let negativeCount = 0
    
    positiveWords.forEach(word => {
      if (lowerInput.includes(word)) positiveCount++
    })
    
    negativeWords.forEach(word => {
      if (lowerInput.includes(word)) negativeCount++
    })
    
    let sentiment = 'neutral'
    let confidence = 0.5
    
    if (positiveCount > negativeCount) {
      sentiment = 'positive'
      confidence = 0.6 + (positiveCount * 0.1)
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative'
      confidence = 0.6 + (negativeCount * 0.1)
    }
    
    return {
      success: true,
      output: `Sentiment: ${sentiment} (confidence: ${(confidence * 100).toFixed(1)}%)`,
      metadata: { sentiment, confidence, positiveCount, negativeCount }
    }
  }

  private async executeSummarizer(input: string): Promise<ToolResult> {
    const sentences = input.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const wordCount = input.split(/\s+/).length
    const summary = sentences.length > 3 
      ? sentences.slice(0, 2).join('. ') + '...'
      : input

    return {
      success: true,
      output: `Summary (${wordCount} words → ${summary.split(/\s+/).length} words): ${summary}`,
      metadata: { originalLength: wordCount, summaryLength: summary.split(/\s+/).length }
    }
  }

  private async executeTranslator(input: string): Promise<ToolResult> {
    const parts = input.split('|').map(p => p.trim())
    if (parts.length !== 2) {
      return {
        success: false,
        output: 'Format: <text> | <target_language>'
      }
    }

    const [text, targetLang] = parts

    return {
      success: true,
      output: `Translated to ${targetLang}: [Simulated translation of "${text}"]`,
      metadata: { sourceLang: 'auto', targetLang, textLength: text.length }
    }
  }

  private executeValidator(input: string): ToolResult {
    const validations: Record<string, boolean> = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input),
      url: /^https?:\/\/.+/.test(input),
      number: !isNaN(Number(input)),
      json: (() => { try { JSON.parse(input); return true } catch { return false } })()
    }

    const validTypes = Object.entries(validations)
      .filter(([, valid]) => valid)
      .map(([type]) => type)

    return {
      success: true,
      output: validTypes.length > 0 
        ? `Valid ${validTypes.join(', ')} format`
        : 'No standard format detected',
      metadata: { validations, validTypes }
    }
  }
}

export const toolExecutor = new AgentToolExecutor()

export function getToolDescription(tool: AgentTool): string {
  const descriptions: Record<AgentTool, string> = {
    calculator: 'Perform mathematical calculations',
    datetime: 'Get current date, time, and related information',
    memory: 'Store and recall information across agent runs',
    web_search: 'Search for information online',
    code_interpreter: 'Execute JavaScript code safely',
    file_reader: 'Read and process file contents',
    json_parser: 'Parse and analyze JSON data',
    api_caller: 'Make HTTP API requests',
    data_analyzer: 'Analyze datasets and extract insights',
    image_generator: 'Generate images from text prompts',
    sentiment_analyzer: 'Analyze sentiment in text',
    summarizer: 'Create concise summaries of text',
    translator: 'Translate text between languages',
    validator: 'Validate data formats and patterns'
  }

  return descriptions[tool] || 'Unknown tool'
}

export function getToolCategory(tool: AgentTool): 'computation' | 'data' | 'communication' | 'analysis' | 'generation' {
  const categories: Record<AgentTool, 'computation' | 'data' | 'communication' | 'analysis' | 'generation'> = {
    calculator: 'computation',
    datetime: 'computation',
    code_interpreter: 'computation',
    memory: 'data',
    file_reader: 'data',
    json_parser: 'data',
    data_analyzer: 'analysis',
    sentiment_analyzer: 'analysis',
    validator: 'analysis',
    summarizer: 'analysis',
    web_search: 'communication',
    api_caller: 'communication',
    image_generator: 'generation',
    translator: 'generation'
  }

  return categories[tool] || 'data'
}
