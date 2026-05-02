import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GeneralSettings } from './GeneralSettings'
import type { AppSettings } from '@/lib/types'

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
  defaultMaxTokens: 2048,
  autoRunAgents: false,
  showAgentThinking: true,
  agentTimeout: 30,
  useConversationContext: true,
  contextWindowSize: 4096,
  notificationsEnabled: true,
  notificationSound: true,
  notifyAgentComplete: true,
  notifyModelLoaded: true,
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
  apiEndpoint: '',
  requestTimeout: 30,
  retryAttempts: 3,
  cacheEnabled: true,
  offlineMode: false,
}

describe('GeneralSettings', () => {
  it('renders section heading', () => {
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('General Settings')).toBeInTheDocument()
  })

  it('renders language & region section', () => {
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Language & Region')).toBeInTheDocument()
  })

  it('renders performance section', () => {
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Performance')).toBeInTheDocument()
  })

  it('displays autoSave switch as checked when setting is true', () => {
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const autoSaveSwitch = screen.getByRole('switch', { name: /auto-save/i })
    expect(autoSaveSwitch).toHaveAttribute('data-state', 'checked')
  })

  it('displays autoSave switch as unchecked when setting is false', () => {
    render(<GeneralSettings settings={{ ...defaultSettings, autoSave: false }} onSettingsChange={vi.fn()} />)
    const autoSaveSwitch = screen.getByRole('switch', { name: /auto-save/i })
    expect(autoSaveSwitch).toHaveAttribute('data-state', 'unchecked')
  })

  it('calls onSettingsChange with updated autoSave when toggled', () => {
    const onChange = vi.fn()
    render(<GeneralSettings settings={{ ...defaultSettings, autoSave: false }} onSettingsChange={onChange} />)
    const autoSaveSwitch = screen.getByRole('switch', { name: /auto-save/i })
    fireEvent.click(autoSaveSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ autoSave: true }))
  })

  it('calls onSettingsChange with updated confirmDelete when toggled', () => {
    const onChange = vi.fn()
    render(<GeneralSettings settings={{ ...defaultSettings, confirmDelete: true }} onSettingsChange={onChange} />)
    const confirmSwitch = screen.getByRole('switch', { name: /confirm before deleting/i })
    fireEvent.click(confirmSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ confirmDelete: false }))
  })

  it('calls onSettingsChange with updated keyboardShortcuts when toggled', () => {
    const onChange = vi.fn()
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const kbSwitch = screen.getByRole('switch', { name: /keyboard shortcuts/i })
    fireEvent.click(kbSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ keyboardShortcuts: false }))
  })

  it('calls onSettingsChange with updated preloadModels when toggled', () => {
    const onChange = vi.fn()
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const preloadSwitch = screen.getByRole('switch', { name: /preload models/i })
    fireEvent.click(preloadSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ preloadModels: true }))
  })

  it('renders maxHistory input with current value', () => {
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(50)
  })

  it('calls onSettingsChange with updated maxHistory on input change', () => {
    const onChange = vi.fn()
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '100' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxHistory: 100 }))
  })

  it('language select can be opened', () => {
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const trigger = screen.getByRole('combobox', { name: /language/i })
    expect(trigger).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.getByRole('option', { name: 'Español' })).toBeInTheDocument()
  })

  it('calls onSettingsChange with updated language when Select changes', () => {
    const onChange = vi.fn()
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: /language/i })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: 'Español' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ language: 'es' }))
  })

  it('timezone select can be opened', () => {
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const trigger = screen.getByRole('combobox', { name: /timezone/i })
    expect(trigger).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.getByRole('option', { name: 'Eastern Time' })).toBeInTheDocument()
  })

  it('calls onSettingsChange with updated timezone when Select changes', () => {
    const onChange = vi.fn()
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: /timezone/i })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: 'Tokyo' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'Asia/Tokyo' }))
  })

  it('date format select can be opened', () => {
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const trigger = screen.getByRole('combobox', { name: /date format/i })
    expect(trigger).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.getByRole('option', { name: 'DD/MM/YYYY' })).toBeInTheDocument()
  })

  it('calls onSettingsChange with updated dateFormat when Select changes', () => {
    const onChange = vi.fn()
    render(<GeneralSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: /date format/i })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: 'DD/MM/YYYY' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ dateFormat: 'DD/MM/YYYY' }))
  })
})
