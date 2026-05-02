import { describe, expect, it, vi } from 'vitest'
import { mockLanguageModel } from '@/test/ai-sdk-mocks'
import { AgentToolExecutor } from '../agent-tools'
import { buildAgentTools, buildTrueAIAgent } from './tool-loop-agent'

describe('buildAgentTools', () => {
  it('exposes the full TrueAI tool set by default', () => {
    const tools = buildAgentTools()
    expect(Object.keys(tools).sort()).toEqual(
      [
        'api_caller',
        'calculator',
        'code_interpreter',
        'data_analyzer',
        'datetime',
        'file_reader',
        'image_generator',
        'json_parser',
        'memory',
        'sentiment_analyzer',
        'summarizer',
        'translator',
        'validator',
        'web_search',
      ].sort(),
    )
  })

  it('respects the `tools` allow-list', () => {
    const tools = buildAgentTools({ tools: ['calculator', 'datetime'] })
    expect(Object.keys(tools).sort()).toEqual(['calculator', 'datetime'])
  })

  it('delegates execute() to the supplied AgentToolExecutor', async () => {
    const executor = new AgentToolExecutor()
    const spy = vi.spyOn(executor, 'executeTool').mockResolvedValue({
      success: true,
      output: 'Result: 42',
      metadata: { result: 42 },
    })
    const tools = buildAgentTools({ executor, tools: ['calculator'] })
    const result = await (
      tools.calculator as unknown as {
        execute: (args: { input: string }) => Promise<{ success: boolean; output: string }>
      }
    ).execute({ input: '6 * 7' })
    expect(spy).toHaveBeenCalledWith('calculator', '6 * 7')
    expect(result).toEqual({ success: true, output: 'Result: 42' })
  })

  it('propagates failure output from the executor without throwing', async () => {
    const executor = new AgentToolExecutor()
    vi.spyOn(executor, 'executeTool').mockResolvedValue({
      success: false,
      output: 'tool not available in local-first runtime',
    })
    const tools = buildAgentTools({ executor, tools: ['web_search'] })
    const result = await (
      tools.web_search as unknown as {
        execute: (args: { input: string }) => Promise<{ success: boolean; output: string }>
      }
    ).execute({ input: 'something' })
    expect(result.success).toBe(false)
    expect(result.output).toMatch(/local-first/)
  })
})

describe('buildTrueAIAgent', () => {
  it('constructs an agent bound to the supplied model', () => {
    const model = mockLanguageModel({ text: 'ok' })
    const agent = buildTrueAIAgent({ model })
    expect(agent).toBeDefined()
    // ToolLoopAgent exposes a `generate` method.
    expect(typeof (agent as unknown as { generate: unknown }).generate).toBe(
      'function',
    )
  })

  it('uses a sensible default system prompt', () => {
    const model = mockLanguageModel({ text: 'ok' })
    const agent = buildTrueAIAgent({ model })
    // The system prompt is stored as a settings field; assert it
    // mentions the local-first contract so we get a regression test
    // when it is changed.
    const settings = (agent as unknown as { settings: { system?: string } })
      .settings
    expect(settings.system).toMatch(/local-first/i)
  })

  it('honours an explicit system override', () => {
    const model = mockLanguageModel({ text: 'ok' })
    const agent = buildTrueAIAgent({ model, system: 'custom prompt' })
    const settings = (agent as unknown as { settings: { system?: string } })
      .settings
    expect(settings.system).toBe('custom prompt')
  })
})
