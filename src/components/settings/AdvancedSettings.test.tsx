import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AdvancedSettings } from './AdvancedSettings'
import type { AppSettings } from '@/lib/types'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeAll(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => {}
    HTMLElement.prototype.releasePointerCapture = () => {}
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {}
  }
})

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

describe('AdvancedSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Advanced Settings heading', () => {
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Advanced Settings')).toBeInTheDocument()
  })

  it('renders Developer Options section', () => {
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Developer Options')).toBeInTheDocument()
  })

  it('renders Network & Performance section', () => {
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Network & Performance')).toBeInTheDocument()
  })

  it('renders System section', () => {
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('renders Caution warning card', () => {
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Caution')).toBeInTheDocument()
  })

  it('shows debugMode switch as unchecked when false', () => {
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const debugSwitch = screen.getByRole('switch', { name: /debug mode/i })
    expect(debugSwitch).toHaveAttribute('data-state', 'unchecked')
  })

  it('shows debugMode switch as checked when true', () => {
    render(<AdvancedSettings settings={{ ...defaultSettings, debugMode: true }} onSettingsChange={vi.fn()} />)
    const debugSwitch = screen.getByRole('switch', { name: /debug mode/i })
    expect(debugSwitch).toHaveAttribute('data-state', 'checked')
  })

  it('calls onSettingsChange with updated debugMode when toggled', () => {
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const debugSwitch = screen.getByRole('switch', { name: /debug mode/i })
    fireEvent.click(debugSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ debugMode: true }))
  })

  it('calls onSettingsChange with updated devTools when toggled', () => {
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const devToolsSwitch = screen.getByRole('switch', { name: /developer tools/i })
    fireEvent.click(devToolsSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ devTools: true }))
  })

  it('calls onSettingsChange with updated experimentalFeatures when toggled', () => {
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const expSwitch = screen.getByRole('switch', { name: /experimental features/i })
    fireEvent.click(expSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ experimentalFeatures: true }))
  })

  it('calls onSettingsChange with updated cacheEnabled when toggled', () => {
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const cacheSwitch = screen.getByRole('switch', { name: /enable caching/i })
    fireEvent.click(cacheSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cacheEnabled: false }))
  })

  it('calls onSettingsChange with updated offlineMode when toggled', () => {
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const offlineSwitch = screen.getByRole('switch', { name: /offline mode/i })
    fireEvent.click(offlineSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ offlineMode: true }))
  })

  it('Clear Browser Cache button calls localStorage.clear and shows toast', async () => {
    const { toast } = await import('sonner')
    const clearSpy = vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {})
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const clearBtn = screen.getByRole('button', { name: /clear browser cache/i })
    fireEvent.click(clearBtn)
    expect(clearSpy).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Browser cache cleared')
    clearSpy.mockRestore()
  })

  it('Reset to Default Settings calls onSettingsChange when confirm returns true', async () => {
    const { toast } = await import('sonner')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const resetBtn = screen.getByRole('button', { name: /reset to default settings/i })
    fireEvent.click(resetBtn)
    expect(confirmSpy).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Settings reset to defaults')
    confirmSpy.mockRestore()
  })

  it('Reset to Default Settings does not call onSettingsChange when confirm returns false', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const resetBtn = screen.getByRole('button', { name: /reset to default settings/i })
    fireEvent.click(resetBtn)
    expect(onChange).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('Reload Application button calls window.location.reload', () => {
    vi.stubGlobal('location', { reload: vi.fn(), href: '/' })
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const reloadBtn = screen.getByRole('button', { name: /reload application/i })
    fireEvent.click(reloadBtn)
    expect(window.location.reload).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('displays request timeout input with current value', () => {
    render(<AdvancedSettings settings={{ ...defaultSettings, requestTimeout: 30000 }} onSettingsChange={vi.fn()} />)
    const input = screen.getByRole('spinbutton', { name: /request timeout/i })
    expect((input as HTMLInputElement).value).toBe('30000')
  })

  it('calls onSettingsChange with updated requestTimeout when changed', () => {
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const input = screen.getByRole('spinbutton', { name: /request timeout/i })
    fireEvent.change(input, { target: { value: '60000' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ requestTimeout: 60000 }))
  })

  it('displays retry attempts input with current value', () => {
    render(<AdvancedSettings settings={{ ...defaultSettings, retryAttempts: 3 }} onSettingsChange={vi.fn()} />)
    const input = screen.getByRole('spinbutton', { name: /retry attempts/i })
    expect((input as HTMLInputElement).value).toBe('3')
  })

  it('calls onSettingsChange with updated retryAttempts when changed', () => {
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const input = screen.getByRole('spinbutton', { name: /retry attempts/i })
    fireEvent.change(input, { target: { value: '5' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ retryAttempts: 5 }))
  })

  it('API Endpoint select can be opened', () => {
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const trigger = screen.getByRole('combobox', { name: /api endpoint/i })
    expect(trigger).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.getByRole('option', { name: 'Custom' })).toBeInTheDocument()
  })

  it('calls onSettingsChange with updated apiEndpoint when Select changes', () => {
    const onChange = vi.fn()
    render(<AdvancedSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: /api endpoint/i })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: 'Custom' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ apiEndpoint: 'custom' }))
  })
})
