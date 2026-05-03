/**
 * Settings panel for the on-device LLM runtime. Lets the user choose which
 * OpenAI-compatible server to talk to (Ollama, llama.cpp, LM Studio, OpenAI,
 * or any other compatible endpoint), configure auth, pick a default model,
 * and run a connectivity probe.
 *
 * Persists via `updateLLMRuntimeConfig` so settings survive reloads and
 * apply immediately to subsequent `spark.llm` / agent / benchmark calls.
 */

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  DEFAULT_LLM_RUNTIME_CONFIG,
  ensureLLMRuntimeConfigLoaded,
  subscribeToLLMRuntimeConfig,
  updateLLMRuntimeConfig,
  type LLMProvider,
  type LLMRuntimeConfig,
} from '@/lib/llm-runtime/config'
import { testLLMRuntimeConnection } from '@/lib/llm-runtime/client'
import { GGUFPicker } from './GGUFPicker'

interface ProviderPreset {
  label: string
  baseUrl: string
  defaultModel: string
  description: string
}

const PROVIDER_PRESETS: Record<LLMProvider, ProviderPreset> = {
  ollama: {
    label: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    description:
      'Local Ollama server. Install ollama, run `ollama serve`, and `ollama pull llama3.2`.',
  },
  'llama-cpp': {
    label: 'llama.cpp (llama-server)',
    baseUrl: 'http://localhost:8080/v1',
    defaultModel: 'local-model',
    description:
      'llama.cpp HTTP server. Start with `llama-server -m path/to/model.gguf --port 8080`.',
  },
  'lm-studio': {
    label: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    description:
      'LM Studio local server. Open LM Studio → Local Server → Start Server.',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    description: 'Hosted OpenAI API. Requires an API key.',
  },
  'openai-compatible': {
    label: 'OpenAI-compatible (custom)',
    baseUrl: 'http://localhost:8000/v1',
    defaultModel: 'local-model',
    description:
      'Any OpenAI-compatible endpoint: vLLM, LiteLLM, text-generation-webui, etc.',
  },
  anthropic: {
    label: 'Anthropic (hosted)',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    description:
      'Hosted Anthropic API via the Vercel AI SDK. Requires an API key. ' +
      'Direct browser calls may be blocked by CORS depending on your network.',
  },
  google: {
    label: 'Google Generative AI (hosted)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash',
    description:
      'Hosted Google Generative AI via the Vercel AI SDK. Requires an API key. ' +
      'Direct browser calls may be blocked by CORS depending on your network.',
  },
  'local-wasm': {
    label: 'Local (on-device, WASM)',
    baseUrl: 'hf:Mozilla/Llama-3.2-1B-Instruct-llamafile:Llama-3.2-1B-Instruct.Q4_K_M.gguf',
    defaultModel: 'Llama-3.2-1B-Instruct-Q4_K_M',
    description:
      'True on-device inference via @wllama/wllama (WASM build of llama.cpp). ' +
      "Set 'Base URL' to a .gguf URL or 'hf:<owner>/<repo>:<path>' shortcut. " +
      'API key is ignored. On first use the wllama WASM runtime assets ' +
      'and the GGUF model are downloaded once into the browser cache; ' +
      'after that all inference runs locally with no further network calls.',
  },
}

interface ConnectionStatus {
  state: 'idle' | 'testing' | 'success' | 'error'
  message?: string
  models?: string[]
}

/**
 * Per-provider visibility for the "extended" sampling knobs added in PR 2.
 *
 * - **Top-K / Min-P / Repeat Penalty** are llama.cpp-family concepts. The
 *   hosted OpenAI-API providers (OpenAI, Anthropic, Google) either don't
 *   accept them at all or use a different field (`frequency_penalty`),
 *   so the HTTP path in `client.ts` already omits them when they're at
 *   their neutral values. To keep the UI honest we hide the knobs for
 *   those providers entirely — exposing them would imply they take effect
 *   when in reality the request body would silently drop them.
 * - **Context Size** is only meaningful for on-device runtimes (wllama
 *   `n_ctx`, native llama.cpp `n_ctx`). HTTP servers manage their own
 *   context windows, so the knob is hidden unless the provider is one
 *   of the on-device variants.
 */
interface SamplingCapabilities {
  topK: boolean
  minP: boolean
  repeatPenalty: boolean
  contextSize: boolean
}

const HOSTED_PROVIDERS = new Set<LLMProvider>(['openai', 'anthropic', 'google'])
const ON_DEVICE_PROVIDERS = new Set<LLMProvider>(['local-wasm'])

function getSamplingCapabilities(provider: LLMProvider): SamplingCapabilities {
  const hosted = HOSTED_PROVIDERS.has(provider)
  return {
    topK: !hosted,
    minP: !hosted,
    repeatPenalty: !hosted,
    contextSize: ON_DEVICE_PROVIDERS.has(provider),
  }
}

/**
 * Coerce a user-typed numeric input into a finite number within
 * `[min, max]`, falling back to `fallback` for blank / NaN inputs.
 * Used by the new slider+numeric pairs so the slider never
 * receives an invalid value.
 */
function clampNumber(
  raw: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < min) return min
  if (parsed > max) return max
  return parsed
}

export function LLMRuntimeSettings() {
  const [config, setConfig] = useState<LLMRuntimeConfig>(DEFAULT_LLM_RUNTIME_CONFIG)
  const [draft, setDraft] = useState<LLMRuntimeConfig>(DEFAULT_LLM_RUNTIME_CONFIG)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>({ state: 'idle' })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Hydrate from persisted config on mount and subscribe to external updates
  // so that two open Settings dialogs stay in sync.
  useEffect(() => {
    let cancelled = false
    void ensureLLMRuntimeConfigLoaded().then((cfg) => {
      if (cancelled) return
      setConfig(cfg)
      setDraft(cfg)
      setLoaded(true)
    })
    const unsubscribe = subscribeToLLMRuntimeConfig((cfg) => {
      setConfig(cfg)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const isDirty =
    draft.provider !== config.provider ||
    draft.baseUrl !== config.baseUrl ||
    draft.apiKey !== config.apiKey ||
    draft.defaultModel !== config.defaultModel ||
    draft.requestTimeoutMs !== config.requestTimeoutMs ||
    draft.temperature !== config.temperature ||
    draft.topP !== config.topP ||
    draft.topK !== config.topK ||
    draft.minP !== config.minP ||
    draft.repeatPenalty !== config.repeatPenalty ||
    draft.contextSize !== config.contextSize ||
    draft.maxTokens !== config.maxTokens

  const capabilities = getSamplingCapabilities(draft.provider)

  const handleProviderChange = (next: string) => {
    const provider = next as LLMProvider
    const preset = PROVIDER_PRESETS[provider]
    setDraft((prev) => ({
      ...prev,
      provider,
      // Only adopt the preset URL/model if the user hasn't customised them
      // away from the previous preset's defaults.
      baseUrl:
        prev.baseUrl === PROVIDER_PRESETS[prev.provider]?.baseUrl ? preset.baseUrl : prev.baseUrl,
      defaultModel:
        prev.defaultModel === PROVIDER_PRESETS[prev.provider]?.defaultModel
          ? preset.defaultModel
          : prev.defaultModel,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const next = await updateLLMRuntimeConfig(draft)
      setConfig(next)
      setDraft(next)
      toast.success('LLM runtime settings saved')
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setDraft(config)
  }

  const handleTest = async () => {
    setStatus({ state: 'testing', message: 'Probing endpoint…' })
    const result = await testLLMRuntimeConnection(draft.baseUrl, draft.apiKey)
    if (result.ok) {
      setStatus({
        state: 'success',
        message: `Connected${result.status ? ` (HTTP ${result.status})` : ''}.`,
        models: result.models,
      })
    } else {
      setStatus({
        state: 'error',
        message: result.error ?? 'Unknown error',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">LLM Runtime</h3>
        <p className="text-sm text-muted-foreground">
          Choose which on-device or self-hosted LLM server this app talks to. Settings are
          stored locally on the device and apply to chat, agents, and benchmarks.
        </p>
      </div>

      <Separator />

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="llm-provider">Provider</Label>
          <Select value={draft.provider} onValueChange={handleProviderChange}>
            <SelectTrigger id="llm-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROVIDER_PRESETS) as LLMProvider[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_PRESETS[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {PROVIDER_PRESETS[draft.provider].description}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-base-url">Base URL</Label>
          <Input
            id="llm-base-url"
            type="url"
            value={draft.baseUrl}
            placeholder={PROVIDER_PRESETS[draft.provider].baseUrl}
            onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {draft.provider === 'local-wasm' && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                Browse Hugging Face…
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Search the Hub for a <code>.gguf</code> file and fill in the
                Base URL automatically as <code>hf:&lt;owner&gt;/&lt;repo&gt;:&lt;file&gt;</code>.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            The app will POST to <code>{draft.baseUrl.replace(/\/+$/, '')}/chat/completions</code>.
          </p>
        </div>

        <GGUFPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(shortcut) => setDraft((prev) => ({ ...prev, baseUrl: shortcut }))}
        />

        <div className="space-y-2">
          <Label htmlFor="llm-api-key">API key (optional)</Label>
          <Input
            id="llm-api-key"
            type="password"
            value={draft.apiKey}
            placeholder="Leave blank for unauthenticated local servers"
            onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Sent as <code>Authorization: Bearer &lt;key&gt;</code>. Stored locally; never
            transmitted anywhere except your configured server.
          </p>
          {draft.apiKey.length > 0 && draft.baseUrl.startsWith('http://') && (
            <p className="text-xs text-amber-500" role="alert">
              ⚠ Your endpoint uses plain HTTP. The API key will be transmitted
              unencrypted on every request — only safe for trusted local
              networks (e.g. <code>localhost</code>). Use HTTPS for any remote
              server.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-default-model">Default model</Label>
          <Input
            id="llm-default-model"
            value={draft.defaultModel}
            placeholder={PROVIDER_PRESETS[draft.provider].defaultModel}
            onChange={(e) => setDraft({ ...draft, defaultModel: e.target.value })}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            list="llm-model-suggestions"
          />
          {status.models && status.models.length > 0 && (
            <datalist id="llm-model-suggestions">
              {status.models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          )}
          <p className="text-xs text-muted-foreground">
            Used when a chat or agent doesn't specify a model explicitly.
          </p>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h4 className="font-medium">Sampling defaults</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="llm-temperature">Temperature</Label>
            <Input
              id="llm-temperature"
              type="number"
              min={0}
              max={2}
              step={0.05}
              value={draft.temperature}
              onChange={(e) =>
                setDraft({ ...draft, temperature: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="llm-top-p">Top P</Label>
            <Input
              id="llm-top-p"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={draft.topP}
              onChange={(e) => setDraft({ ...draft, topP: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="llm-max-tokens">Max tokens</Label>
            <Input
              id="llm-max-tokens"
              type="number"
              min={1}
              step={1}
              value={draft.maxTokens}
              onChange={(e) => {
                const parsed = Number(e.target.value)
                setDraft({
                  ...draft,
                  maxTokens: Number.isFinite(parsed) && parsed >= 1 ? parsed : 1,
                })
              }}
            />
          </div>
        </div>

        {(capabilities.topK || capabilities.minP || capabilities.repeatPenalty) && (
          <>
            <Separator />
            <div className="space-y-1">
              <h5 className="text-sm font-medium">Local-runtime sampling</h5>
              <p className="text-xs text-muted-foreground">
                Extra knobs honoured by llama.cpp / wllama / Ollama and other
                local OpenAI-compatible servers. Hosted providers (OpenAI,
                Anthropic, Google) ignore these — set a knob to its
                neutral value (Top-K = 0, Min-P = 0, Repeat Penalty = 1) to
                omit it from outgoing requests entirely.
              </p>
            </div>

            {capabilities.topK && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="llm-top-k">Top-K</Label>
                  <span
                    className="text-xs text-muted-foreground"
                    aria-hidden="true"
                    data-testid="llm-top-k-value"
                  >
                    {draft.topK === 0 ? 'disabled' : draft.topK}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Slider
                    aria-label="Top-K slider"
                    min={0}
                    max={200}
                    step={1}
                    value={[draft.topK]}
                    onValueChange={(v) => setDraft({ ...draft, topK: v[0] ?? 0 })}
                    className="flex-1"
                  />
                  <Input
                    id="llm-top-k"
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    value={draft.topK}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        topK: clampNumber(e.target.value, 0, 1000, 0),
                      })
                    }
                    className="w-24"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Limits sampling to the K most probable tokens. <code>0</code>{' '}
                  disables top-k filtering.
                </p>
              </div>
            )}

            {capabilities.minP && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="llm-min-p">Min-P</Label>
                  <span
                    className="text-xs text-muted-foreground"
                    aria-hidden="true"
                    data-testid="llm-min-p-value"
                  >
                    {draft.minP === 0 ? 'disabled' : draft.minP.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Slider
                    aria-label="Min-P slider"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[draft.minP]}
                    onValueChange={(v) => setDraft({ ...draft, minP: v[0] ?? 0 })}
                    className="flex-1"
                  />
                  <Input
                    id="llm-min-p"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={draft.minP}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        minP: clampNumber(e.target.value, 0, 1, 0),
                      })
                    }
                    className="w-24"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Drops tokens whose probability is less than{' '}
                  <code>min_p × max-token-probability</code>. Native to
                  llama.cpp; hosted providers do not support it.{' '}
                  <code>0</code> disables it.
                </p>
              </div>
            )}

            {capabilities.repeatPenalty && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="llm-repeat-penalty">Repeat penalty</Label>
                  <span
                    className="text-xs text-muted-foreground"
                    aria-hidden="true"
                    data-testid="llm-repeat-penalty-value"
                  >
                    {draft.repeatPenalty <= 1
                      ? 'disabled'
                      : draft.repeatPenalty.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Slider
                    aria-label="Repeat penalty slider"
                    min={1}
                    max={2}
                    step={0.01}
                    value={[draft.repeatPenalty]}
                    onValueChange={(v) =>
                      setDraft({ ...draft, repeatPenalty: v[0] ?? 1 })
                    }
                    className="flex-1"
                  />
                  <Input
                    id="llm-repeat-penalty"
                    type="number"
                    min={1}
                    max={2}
                    step={0.01}
                    value={draft.repeatPenalty}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        repeatPenalty: clampNumber(e.target.value, 1, 2, 1),
                      })
                    }
                    className="w-24"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Penalises tokens already present in the context to reduce
                  repetition loops. <code>1</code> disables the penalty;{' '}
                  <code>1.1</code> is the OfflineLLM default.
                </p>
              </div>
            )}
          </>
        )}

        {capabilities.contextSize && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="llm-context-size">Context size (tokens)</Label>
                <span
                  className="text-xs text-muted-foreground"
                  aria-hidden="true"
                  data-testid="llm-context-size-value"
                >
                  {draft.contextSize}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  aria-label="Context size slider"
                  min={512}
                  max={32768}
                  step={512}
                  value={[draft.contextSize]}
                  onValueChange={(v) =>
                    setDraft({ ...draft, contextSize: v[0] ?? 2048 })
                  }
                  className="flex-1"
                />
                <Input
                  id="llm-context-size"
                  type="number"
                  min={1}
                  step={1}
                  value={draft.contextSize}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      contextSize: clampNumber(e.target.value, 1, 131072, 2048),
                    })
                  }
                  className="w-28"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                On-device context window in tokens. Larger windows use more
                RAM and slow first-token latency. The model is reloaded
                whenever this value changes.
              </p>
            </div>
          </>
        )}

        <Separator />
        <div className="space-y-2">
          <Label htmlFor="llm-timeout">Request timeout (ms)</Label>
          <Input
            id="llm-timeout"
            type="number"
            min={1000}
            step={500}
            value={draft.requestTimeoutMs}
            onChange={(e) =>
              setDraft({
                ...draft,
                requestTimeoutMs: Math.max(1000, Number(e.target.value) || 1000),
              })
            }
          />
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleTest} variant="outline" disabled={status.state === 'testing'}>
          {status.state === 'testing' ? 'Testing…' : 'Test connection'}
        </Button>
        <Button onClick={handleSave} disabled={!isDirty || saving || !loaded}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={handleReset} variant="ghost" disabled={!isDirty || saving}>
          Discard changes
        </Button>
      </div>

      {status.state !== 'idle' && status.message && (
        <Card
          className={
            status.state === 'success'
              ? 'p-3 border-green-500/40 bg-green-500/10 text-sm'
              : status.state === 'error'
                ? 'p-3 border-red-500/40 bg-red-500/10 text-sm'
                : 'p-3 text-sm'
          }
        >
          <div className="font-medium">
            {status.state === 'success'
              ? '✓ Endpoint reachable'
              : status.state === 'error'
                ? '✗ Could not reach endpoint'
                : '…'}
          </div>
          <div className="mt-1 text-muted-foreground break-words">{status.message}</div>
          {status.models && status.models.length > 0 && (
            <div className="mt-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Available models ({status.models.length})
              </div>
              <div className="mt-1 text-xs font-mono break-words">
                {status.models.slice(0, 12).join(', ')}
                {status.models.length > 12 ? ', …' : ''}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
