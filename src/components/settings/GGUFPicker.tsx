/**
 * In-app GGUF model picker for the `local-wasm` runtime.
 *
 * Searches the public Hugging Face Hub API for repositories tagged
 * with `gguf`, lets the user drill into a repo to pick a specific
 * `.gguf` file (sorted by size so the smallest quant is first), and
 * emits the resulting `hf:<owner>/<repo>:<filename>` shortcut to its
 * caller. The shortcut is the same format consumed by
 * `local-wllama-provider.ts` `getOrCreateInstance()` which calls
 * `wllama.loadModelFromHF(repo, file)` under the hood — so the picker
 * is purely a UI affordance for filling in the Base URL field; nothing
 * about the runtime path changes.
 *
 * Network calls
 * -------------
 * Two unauthenticated GETs against `huggingface.co`:
 *   - `GET /api/models?search=Q&filter=gguf&limit=20`
 *   - `GET /api/models/{repoId}/tree/main`
 *
 * Both endpoints are documented in the public Hub HTTP API and require
 * no API key for public repositories. We deliberately do NOT proxy
 * through any third party — keeping with TrueAI's local-first /
 * no-telemetry stance.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface GGUFPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with `hf:<owner>/<repo>:<filename>` when the user confirms. */
  onSelect: (shortcut: string) => void
}

interface HFModelSummary {
  id: string
  downloads?: number
  likes?: number
}

interface HFTreeEntry {
  type: 'file' | 'directory'
  path: string
  size?: number
}

interface GGUFFile {
  path: string
  size: number
}

const HF_API = 'https://huggingface.co/api'
const SEARCH_LIMIT = 20

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'unknown size'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

export function GGUFPicker({ open, onOpenChange, onSelect }: GGUFPickerProps) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<HFModelSummary[]>([])

  const [activeRepo, setActiveRepo] = useState<string | null>(null)
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [files, setFiles] = useState<GGUFFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  // Abort in-flight requests when the dialog closes or the user
  // launches a new search/repo open. Without this a slow HF response
  // can clobber state after the user has moved on.
  const abortRef = useRef<AbortController | null>(null)

  // Reset all state when the dialog closes so re-opening is clean.
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      abortRef.current = null
      setQuery('')
      setSearching(false)
      setSearchError(null)
      setResults([])
      setActiveRepo(null)
      setFilesLoading(false)
      setFilesError(null)
      setFiles([])
      setSelectedFile(null)
    }
  }, [open])

  const runSearch = useCallback(async () => {
    const q = query.trim()
    if (q.length === 0) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSearching(true)
    setSearchError(null)
    setResults([])
    setActiveRepo(null)
    setFiles([])
    setSelectedFile(null)
    try {
      const url = `${HF_API}/models?search=${encodeURIComponent(q)}&filter=gguf&limit=${SEARCH_LIMIT}`
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) {
        throw new Error(`Hugging Face search failed (HTTP ${res.status})`)
      }
      const json = (await res.json()) as HFModelSummary[]
      setResults(Array.isArray(json) ? json : [])
    } catch (err) {
      if (controller.signal.aborted) return
      setSearchError(err instanceof Error ? err.message : String(err))
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }, [query])

  const openRepo = useCallback(async (repoId: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setActiveRepo(repoId)
    setFiles([])
    setSelectedFile(null)
    setFilesError(null)
    setFilesLoading(true)
    try {
      const url = `${HF_API}/models/${repoId}/tree/main`
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) {
        throw new Error(`Could not list files for ${repoId} (HTTP ${res.status})`)
      }
      const json = (await res.json()) as HFTreeEntry[]
      const ggufs: GGUFFile[] = (Array.isArray(json) ? json : [])
        .filter(
          (e): e is HFTreeEntry & { size: number } =>
            e?.type === 'file' &&
            typeof e.path === 'string' &&
            e.path.toLowerCase().endsWith('.gguf') &&
            typeof e.size === 'number',
        )
        .map((e) => ({ path: e.path, size: e.size }))
        .sort((a, b) => a.size - b.size)
      setFiles(ggufs)
      if (ggufs.length === 1) setSelectedFile(ggufs[0].path)
    } catch (err) {
      if (controller.signal.aborted) return
      setFilesError(err instanceof Error ? err.message : String(err))
    } finally {
      if (!controller.signal.aborted) setFilesLoading(false)
    }
  }, [])

  const handleConfirm = () => {
    if (!activeRepo || !selectedFile) return
    onSelect(`hf:${activeRepo}:${selectedFile}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pick a GGUF model from Hugging Face</DialogTitle>
          <DialogDescription>
            Searches the public Hugging Face Hub for repositories tagged{' '}
            <code>gguf</code>. Selecting a file fills in the Base URL with the{' '}
            <code>hf:&lt;owner&gt;/&lt;repo&gt;:&lt;file&gt;</code> shortcut that the
            on-device WASM runtime understands. The model itself is downloaded
            on first chat use, not now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="gguf-picker-query">Search</Label>
          <div className="flex gap-2">
            <Input
              id="gguf-picker-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void runSearch()
                }
              }}
              placeholder="e.g. llama-3.2-1b-instruct, qwen2.5-0.5b, phi-3-mini"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <Button onClick={() => void runSearch()} disabled={searching || query.trim().length === 0}>
              {searching ? 'Searching…' : 'Search'}
            </Button>
          </div>
          {searchError && (
            <p className="text-xs text-destructive" role="alert">
              {searchError}
            </p>
          )}
        </div>

        <Separator />

        <div className="flex flex-1 min-h-0 gap-4 py-2">
          <div className="flex-1 min-w-0 flex flex-col">
            <Label className="text-xs text-muted-foreground mb-1">
              Repositories ({results.length})
            </Label>
            <ScrollArea className="flex-1 border rounded-md">
              <ul className="divide-y" aria-label="Hugging Face GGUF search results">
                {results.length === 0 && !searching && (
                  <li className="p-3 text-xs text-muted-foreground">
                    No results yet. Type a query and press Search.
                  </li>
                )}
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => void openRepo(r.id)}
                      className={`w-full text-left p-2 hover:bg-muted/40 focus:bg-muted/60 outline-none ${
                        activeRepo === r.id ? 'bg-muted/60' : ''
                      }`}
                      aria-label={`Open repository ${r.id}`}
                    >
                      <div className="text-sm font-medium truncate">{r.id}</div>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        {typeof r.downloads === 'number' && (
                          <Badge variant="secondary">{r.downloads.toLocaleString()} downloads</Badge>
                        )}
                        {typeof r.likes === 'number' && (
                          <Badge variant="secondary">♥ {r.likes}</Badge>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <Label className="text-xs text-muted-foreground mb-1">
              {activeRepo ? `GGUF files in ${activeRepo}` : 'Files'}
            </Label>
            <ScrollArea className="flex-1 border rounded-md">
              {!activeRepo && (
                <p className="p-3 text-xs text-muted-foreground">
                  Pick a repository on the left to list its GGUF files.
                </p>
              )}
              {activeRepo && filesLoading && (
                <p className="p-3 text-xs text-muted-foreground">Loading file list…</p>
              )}
              {activeRepo && filesError && (
                <p className="p-3 text-xs text-destructive" role="alert">
                  {filesError}
                </p>
              )}
              {activeRepo && !filesLoading && !filesError && files.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">
                  No <code>.gguf</code> files at the repository root.
                </p>
              )}
              {files.length > 0 && (
                <ul className="divide-y" aria-label={`GGUF files in ${activeRepo}`}>
                  {files.map((f) => {
                    const checked = selectedFile === f.path
                    return (
                      <li key={f.path}>
                        <label className="flex items-start gap-2 p-2 cursor-pointer hover:bg-muted/40">
                          <input
                            type="radio"
                            name="gguf-file"
                            value={f.path}
                            checked={checked}
                            onChange={() => setSelectedFile(f.path)}
                            className="mt-1"
                            aria-label={`Select ${f.path}`}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-mono truncate">{f.path}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatBytes(f.size)}
                            </div>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!activeRepo || !selectedFile}>
            Use this model
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
