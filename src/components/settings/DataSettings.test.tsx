import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DataSettings } from './DataSettings'
import type { AppSettings } from '@/lib/types'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const defaultSettings: AppSettings = {
  autoSave: true,
  confirmDelete: true,
  keyboardShortcuts: true,
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  maxHistory: 50,
  preloadModels: false,
  theme: 'dark',
  fontSize: 14,
  density: 'comfortable',
  showTimestamps: true,
  showAvatars: true,
  compactSidebar: false,
  enableAnimations: true,
  animationSpeed: 1,
  reduceMotion: false,
  streamingEnabled: true,
  codeHighlighting: true,
  markdownEnabled: true,
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  autoRunAgents: false,
  showAgentThinking: true,
  agentTimeout: 120000,
  useConversationContext: true,
  contextWindowSize: 20,
  notificationsEnabled: true,
  notificationSound: true,
  notifyAgentComplete: true,
  notifyModelLoaded: false,
  notifyErrors: true,
  notifyUpdates: true,
  showToast: true,
  toastSuccess: true,
  toastInfo: true,
  analyticsEnabled: false,
  crashReportsEnabled: false,
  telemetryEnabled: false,
  localStorageEnabled: true,
  encryptData: false,
  clearDataOnExit: false,
  requireAuth: false,
  autoLockEnabled: false,
  secureMode: false,
  debugMode: false,
  devTools: false,
  experimentalFeatures: false,
  apiEndpoint: 'default',
  requestTimeout: 30000,
  retryAttempts: 3,
  cacheEnabled: true,
  offlineMode: false,
}

describe('DataSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(spark.kv.get).mockResolvedValue(undefined)
    vi.mocked(spark.kv.set).mockResolvedValue(undefined)
    vi.mocked(spark.kv.delete).mockResolvedValue(undefined)
  })

  it('renders Data Management heading', () => {
    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getAllByText('Data Management').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Storage Usage section', () => {
    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Storage Usage')).toBeInTheDocument()
  })

  it('renders Backup & Restore section', () => {
    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Backup & Restore')).toBeInTheDocument()
  })

  it('renders Danger Zone section', () => {
    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Danger Zone')).toBeInTheDocument()
  })

  it('renders Export All Data button', () => {
    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /export all data/i })).toBeInTheDocument()
  })

  it('renders Import Data button', () => {
    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /import data/i })).toBeInTheDocument()
  })

  it('renders Clear All Data button', () => {
    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /clear all data/i })).toBeInTheDocument()
  })

  it('renders estimated data size', () => {
    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('2.4 MB')).toBeInTheDocument()
  })

  it('shows Exporting... while export is in progress', async () => {
    vi.mocked(spark.kv.get).mockImplementation(() => new Promise(() => {}))
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const exportBtn = screen.getByRole('button', { name: /export all data/i })
    fireEvent.click(exportBtn)

    expect(await screen.findByRole('button', { name: /exporting/i })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('Clear All Data calls spark.kv.delete and shows toast when confirmed', async () => {
    const { toast } = await import('sonner')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.stubGlobal('location', { reload: vi.fn(), href: '/' })
    vi.mocked(spark.kv.delete).mockResolvedValue(undefined)

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const clearBtn = screen.getByRole('button', { name: /clear all data/i })

    await act(async () => {
      fireEvent.click(clearBtn)
    })

    expect(confirmSpy).toHaveBeenCalled()
    expect(spark.kv.delete).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('All data cleared')

    confirmSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('Clear All Data does nothing when confirm returns false', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const clearBtn = screen.getByRole('button', { name: /clear all data/i })

    await act(async () => {
      fireEvent.click(clearBtn)
    })

    expect(spark.kv.delete).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('Clear Conversations shows info toast when no conversations exist', async () => {
    const { toast } = await import('sonner')
    vi.mocked(spark.kv.get).mockResolvedValue([])

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const clearConvBtn = screen.getByRole('button', { name: /clear conversations/i })

    await act(async () => {
      fireEvent.click(clearConvBtn)
    })

    expect(toast.info).toHaveBeenCalledWith('No conversations to clear')
  })

  it('Clear Agents shows info toast when no agents exist', async () => {
    const { toast } = await import('sonner')
    vi.mocked(spark.kv.get).mockResolvedValue([])

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const clearAgentsBtn = screen.getByRole('button', { name: /clear agents/i })

    await act(async () => {
      fireEvent.click(clearAgentsBtn)
    })

    expect(toast.info).toHaveBeenCalledWith('No agents to clear')
  })

  it('Export All Data writes a JSON blob and shows success toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(spark.kv.get).mockImplementation(async (key: string) => {
      if (key === 'conversations') return [{ id: 'c1' }]
      return undefined
    })
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /export all data/i }))
      // resolve the artificial 1s delay in handleExportData
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Data exported successfully'), { timeout: 3000 })
    })

    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
    vi.unstubAllGlobals()
  }, 10000)

  it('Export All Data shows error toast when spark.kv.get rejects', async () => {
    const { toast } = await import('sonner')
    vi.mocked(spark.kv.get).mockRejectedValue(new Error('boom'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /export all data/i }))

    await vi.waitFor(
      () => expect(toast.error).toHaveBeenCalledWith('Failed to export data'),
      { timeout: 3000 },
    )
    // After failure, button text returns from "Exporting..." back to "Export All Data"
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: /export all data/i })).not.toBeDisabled(),
    )

    errorSpy.mockRestore()
  }, 10000)

  it('Clear All Data shows error toast when spark.kv.delete rejects', async () => {
    const { toast } = await import('sonner')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(spark.kv.delete).mockRejectedValue(new Error('fail'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /clear all data/i }))
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to clear data')
    confirmSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('Clear Conversations clears KVs and shows success when confirmed', async () => {
    const { toast } = await import('sonner')
    vi.mocked(spark.kv.get).mockResolvedValue([{ id: 'c1' }])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const reload = vi.fn()
    vi.stubGlobal('location', { reload, href: '/' })

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /clear conversations/i }))
    })

    expect(spark.kv.set).toHaveBeenCalledWith('conversations', [])
    expect(spark.kv.set).toHaveBeenCalledWith('messages', [])
    expect(toast.success).toHaveBeenCalledWith('Conversations cleared')

    confirmSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('Clear Conversations does nothing when confirm is cancelled', async () => {
    vi.mocked(spark.kv.get).mockResolvedValue([{ id: 'c1' }])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /clear conversations/i }))
    })

    expect(spark.kv.set).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('Clear Agents clears KVs and shows success when confirmed', async () => {
    const { toast } = await import('sonner')
    vi.mocked(spark.kv.get).mockResolvedValue([{ id: 'a1' }])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.stubGlobal('location', { reload: vi.fn(), href: '/' })

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /clear agents/i }))
    })

    expect(spark.kv.set).toHaveBeenCalledWith('agents', [])
    expect(spark.kv.set).toHaveBeenCalledWith('agent-runs', [])
    expect(toast.success).toHaveBeenCalledWith('Agents cleared')

    confirmSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('Clear Analytics shows info toast when no analytics exist', async () => {
    const { toast } = await import('sonner')
    vi.mocked(spark.kv.get).mockResolvedValue([])

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /clear analytics/i }))
    })

    expect(toast.info).toHaveBeenCalledWith('No analytics to clear')
  })

  it('Clear Analytics clears KV and shows success when confirmed', async () => {
    const { toast } = await import('sonner')
    vi.mocked(spark.kv.get).mockResolvedValue([{ id: 'e1' }])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /clear analytics/i }))
    })

    expect(spark.kv.set).toHaveBeenCalledWith('analytics-events', [])
    expect(toast.success).toHaveBeenCalledWith('Analytics cleared')
    confirmSpy.mockRestore()
  })

  it('Import Data: invalid JSON shows error toast', async () => {
    const { toast } = await import('sonner')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Capture the dynamically created input
    const realCreate = document.createElement.bind(document)
    let capturedInput: HTMLInputElement | null = null
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'input') {
        capturedInput = el as HTMLInputElement
        // Stub click so jsdom doesn't actually open file dialog
        ;(el as HTMLInputElement).click = vi.fn()
      }
      return el
    })

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /import data/i }))
    expect(capturedInput).not.toBeNull()

    const file = new File(['{not valid json'], 'bad.json', { type: 'application/json' })
    Object.defineProperty(capturedInput!, 'files', { value: [file], configurable: true })

    await act(async () => {
      capturedInput!.onchange?.({ target: capturedInput } as unknown as Event)
      await new Promise(r => setTimeout(r, 0))
    })

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to import data'))
    createSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('Import Data: no file selected returns early without toast', async () => {
    const { toast } = await import('sonner')
    const realCreate = document.createElement.bind(document)
    let capturedInput: HTMLInputElement | null = null
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'input') {
        capturedInput = el as HTMLInputElement
        ;(el as HTMLInputElement).click = vi.fn()
      }
      return el
    })

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /import data/i }))

    Object.defineProperty(capturedInput!, 'files', { value: [], configurable: true })
    await act(async () => {
      capturedInput!.onchange?.({ target: capturedInput } as unknown as Event)
    })

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    createSpy.mockRestore()
  })

  it('Import Data: valid JSON writes each KV entry, shows success toast, and reloads', async () => {
    const { toast } = await import('sonner')
    const reload = vi.fn()
    vi.stubGlobal('location', { reload, href: '/' })

    const realCreate = document.createElement.bind(document)
    let capturedInput: HTMLInputElement | null = null
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'input') {
        capturedInput = el as HTMLInputElement
        ;(el as HTMLInputElement).click = vi.fn()
      }
      return el
    })

    render(<DataSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /import data/i }))

    const payload = { conversations: [{ id: 'c1' }], agents: [{ id: 'a1' }] }
    const file = new File([JSON.stringify(payload)], 'backup.json', {
      type: 'application/json',
    })
    Object.defineProperty(capturedInput!, 'files', { value: [file], configurable: true })

    await act(async () => {
      capturedInput!.onchange?.({ target: capturedInput } as unknown as Event)
      await new Promise((r) => setTimeout(r, 0))
    })

    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Data imported successfully'))
    expect(spark.kv.set).toHaveBeenCalledWith('conversations', [{ id: 'c1' }])
    expect(spark.kv.set).toHaveBeenCalledWith('agents', [{ id: 'a1' }])
    expect(reload).toHaveBeenCalled()

    createSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
