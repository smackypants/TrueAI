import type { AgentTool } from './types'
import { isNative } from './native/platform'

export interface ToolResult {
  success: boolean
  output: string
  error?: string
  metadata?: Record<string, unknown>
}

/** Hard cap on bytes returned by file_reader / api_caller so a runaway
 *  read can't blow up the agent transcript or LLM context. */
const MAX_TOOL_OUTPUT_BYTES = 16 * 1024
/** AbortController timeout for api_caller. */
const API_CALLER_TIMEOUT_MS = 15_000

function truncateForOutput(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_TOOL_OUTPUT_BYTES) return { text, truncated: false }
  return { text: text.slice(0, MAX_TOOL_OUTPUT_BYTES), truncated: true }
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
      // Preserve original casing — only use the lowercased command to detect
      // the prefix; slice the data from the original input.
      const data = input.trim().slice('store:'.length).trim()
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
    // Web search requires a third-party search provider, which the
    // local-first invariant of this app forbids (see LEARNINGS.md and
    // copilot-instructions.md → "Local-first invariants"). Returning
    // fabricated results pretending to be search hits is misleading;
    // failing honestly lets the agent loop downgrade gracefully.
    const query = input.trim()
    return {
      success: false,
      output:
        'web_search is unavailable: no search provider is configured in the local-first runtime.',
      metadata: { query, reason: 'no-provider' },
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

  private async executeFileReader(input: string): Promise<ToolResult> {
    const target = input.trim()
    if (!target) {
      return { success: false, output: 'file_reader: empty path' }
    }
    // Reject parent-directory traversal and absolute system paths to
    // avoid letting an LLM-driven agent wander outside the app sandbox.
    if (target.includes('..') || target.startsWith('/')) {
      return {
        success: false,
        output: 'file_reader: path must be relative and inside the app sandbox',
      }
    }

    try {
      if (isNative()) {
        // Lazy-import the Capacitor plugin so this module stays usable
        // in tests / non-native builds where the plugin isn't wired.
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
        const result = await Filesystem.readFile({
          path: target,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        })
        const raw = typeof result.data === 'string' ? result.data : ''
        const { text, truncated } = truncateForOutput(raw)
        return {
          success: true,
          output: text,
          metadata: {
            filename: target,
            size: raw.length,
            source: 'capacitor-filesystem',
            truncated,
          },
        }
      }

      // Web fallback: relative paths are served from the public dir.
      // The startsWith('/') guard above already rejected absolute paths,
      // so we always need to prepend a leading slash here.
      if (typeof fetch === 'undefined') {
        return { success: false, output: 'file_reader: fetch is unavailable in this environment' }
      }
      const url = `/${target}`
      const res = await fetch(url)
      if (!res.ok) {
        return {
          success: false,
          output: `file_reader: ${res.status} ${res.statusText}`,
          metadata: { filename: target, status: res.status },
        }
      }
      const raw = await res.text()
      const { text, truncated } = truncateForOutput(raw)
      return {
        success: true,
        output: text,
        metadata: {
          filename: target,
          size: raw.length,
          source: 'fetch',
          truncated,
        },
      }
    } catch (err) {
      return {
        success: false,
        output: `file_reader failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  private executeJsonParser(input: string): ToolResult {
    try {
      const parsed = JSON.parse(input)
      // JSON.parse('null') returns null; guard before Object.keys()
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        return {
          success: true,
          output: `Parsed JSON value: ${JSON.stringify(parsed)}`,
          metadata: { parsed }
        }
      }
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
    // Input formats accepted:
    //   "<url>"
    //   "GET <url>"
    //   "POST <url> | <json-body>"
    const trimmed = input.trim()
    if (!trimmed) return { success: false, output: 'api_caller: empty input' }

    let method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    let urlPart = trimmed
    let body: string | undefined

    const methodMatch = /^(GET|POST|PUT|DELETE|PATCH)\s+(.+)$/i.exec(trimmed)
    if (methodMatch) {
      method = methodMatch[1].toUpperCase() as typeof method
      urlPart = methodMatch[2]
    }

    const pipeIdx = urlPart.indexOf('|')
    if (pipeIdx >= 0) {
      body = urlPart.slice(pipeIdx + 1).trim()
      urlPart = urlPart.slice(0, pipeIdx).trim()
    }

    let parsed: URL
    try {
      parsed = new URL(urlPart)
    } catch {
      return { success: false, output: `api_caller: invalid URL "${urlPart}"` }
    }
    // Restrict to https:// to prevent SSRF-flavoured access to local
    // services (file://, http://localhost, capacitor:// internal urls,
    // etc.). The agent runtime is local-first, but the API caller
    // explicitly hits the network, so https-only is the safe default.
    if (parsed.protocol !== 'https:') {
      return {
        success: false,
        output: `api_caller: only https:// URLs are allowed (got ${parsed.protocol})`,
      }
    }

    const start = Date.now()
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = controller
      ? setTimeout(() => controller.abort(), API_CALLER_TIMEOUT_MS)
      : null

    try {
      if (typeof fetch === 'undefined') {
        return { success: false, output: 'api_caller: fetch is unavailable in this environment' }
      }
      const init: RequestInit = {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body && method !== 'GET' && method !== 'DELETE' ? body : undefined,
        signal: controller?.signal,
      }
      const res = await fetch(parsed.toString(), init)
      const text = await res.text()
      const { text: truncatedText, truncated } = truncateForOutput(text)
      const duration = Date.now() - start
      return {
        success: res.ok,
        output: `${method} ${parsed.toString()} → ${res.status} ${res.statusText}\n${truncatedText}`,
        metadata: {
          url: parsed.toString(),
          method,
          status: res.status,
          ok: res.ok,
          responseTime: duration,
          truncated,
        },
      }
    } catch (err) {
      const duration = Date.now() - start
      const aborted = err instanceof Error && err.name === 'AbortError'
      return {
        success: false,
        output: aborted
          ? `api_caller: request timed out after ${API_CALLER_TIMEOUT_MS}ms`
          : `api_caller failed: ${err instanceof Error ? err.message : String(err)}`,
        metadata: { url: parsed.toString(), method, responseTime: duration, aborted },
      }
    } finally {
      if (timer) clearTimeout(timer)
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
    // Image generation requires a hosted model that this local-first
    // runtime doesn't ship. Fail honestly rather than fabricate a URL
    // that points nowhere.
    return {
      success: false,
      output:
        'image_generator is unavailable: no image-generation provider is configured in the local-first runtime.',
      metadata: { prompt: input, reason: 'no-provider' },
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

    // Honest failure: there is no offline translation model in this
    // runtime. Returning a fake "[Simulated translation of ...]"
    // string would mislead downstream agent steps.
    return {
      success: false,
      output:
        'translator is unavailable: no translation provider is configured in the local-first runtime.',
      metadata: { sourceLang: 'auto', targetLang, textLength: text.length, reason: 'no-provider' },
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
