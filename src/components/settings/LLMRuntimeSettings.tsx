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

export function LLMRuntimeSettings() {
  const [config, setConfig] = useState<LLMRuntimeConfig>(DEFAULT_LLM_RUNTIME_CONFIG)
  const [draft, setDraft] = useState<LLMRuntimeConfig>(DEFAULT_LLM_RUNTIME_CONFIG)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>({ state: 'idle' })
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
    draft.maxTokens !== config.maxTokens

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
          <p className="text-xs text-muted-foreground">
            The app will POST to <code>{draft.baseUrl.replace(/\/+$/, '')}/chat/completions</code>.
          </p>
        </div>

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
        <p className="text-xs text-muted-foreground">
          Applied when a chat or agent doesn't pass per-call overrides.
          Top-K, Min-P, and Repeat Penalty are sent as the
          <code className="mx-1">top_k</code>/<code className="mx-1">min_p</code>/
          <code className="mx-1">repeat_penalty</code>
          OpenAI-extension fields, which llama.cpp / Ollama / LM Studio
          honour. Hosted OpenAI ignores unknown fields, so leaving them
          at their defaults is safe.
        </p>
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
            <p className="text-xs text-muted-foreground">
              Lower = focused, higher = creative.
            </p>
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
            <p className="text-xs text-muted-foreground">
              Nucleus sampling: cumulative probability cutoff.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="llm-top-k">Top K</Label>
            <Input
              id="llm-top-k"
              type="number"
              min={0}
              step={1}
              value={draft.topK}
              onChange={(e) => {
                const parsed = Number(e.target.value)
                setDraft({
                  ...draft,
                  topK: Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0,
                })
              }}
            />
            <p className="text-xs text-muted-foreground">
              K most likely tokens. <code>0</code> disables.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="llm-min-p">Min P</Label>
            <Input
              id="llm-min-p"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={draft.minP}
              onChange={(e) => {
                const parsed = Number(e.target.value)
                setDraft({
                  ...draft,
                  minP:
                    Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0,
                })
              }}
            />
            <p className="text-xs text-muted-foreground">
              Filters tokens below this fraction of the top token.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="llm-repeat-penalty">Repeat Penalty</Label>
            <Input
              id="llm-repeat-penalty"
              type="number"
              min={1}
              step={0.05}
              value={draft.repeatPenalty}
              onChange={(e) => {
                const parsed = Number(e.target.value)
                setDraft({
                  ...draft,
                  repeatPenalty:
                    Number.isFinite(parsed) && parsed >= 1 ? parsed : 1,
                })
              }}
            />
            <p className="text-xs text-muted-foreground">
              <code>1</code> = no penalty. Higher discourages repeats.
            </p>
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
            <p className="text-xs text-muted-foreground">
              Response length cap.
            </p>
          </div>
        </div>
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
