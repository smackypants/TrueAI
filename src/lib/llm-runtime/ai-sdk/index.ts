/**
 * Single import surface for AI-SDK-powered features inside TrueAI.
 *
 * Re-exports the bits of the Vercel AI SDK we use, plus a
 * project-specific `getLanguageModel` that is pre-wired to the user's
 * `LLMRuntimeConfig` (provider URL + API key from `secureStorage`).
 *
 * Usage:
 *   import { generateText, getLanguageModel } from '@/lib/llm-runtime/ai-sdk'
 *   const { text } = await generateText({
 *     model: await getLanguageModel('llama3.2'),
 *     prompt: 'Hello',
 *   })
 */

export {
  generateText,
  streamText,
  generateObject,
  streamObject,
  tool,
  ToolLoopAgent,
  Experimental_Agent,
  type LanguageModel,
  type ModelMessage,
  type UIMessage,
} from 'ai'

export {
  getLanguageModel,
  getLanguageModelSync,
  __resetProviderFactoryForTests,
} from './provider-factory'
