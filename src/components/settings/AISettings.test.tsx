import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AISettings } from './AISettings'
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

describe('AISettings', () => {
  it('renders AI Behavior Settings heading', () => {
    render(<AISettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('AI Behavior Settings')).toBeInTheDocument()
  })

  it('renders Response Behavior section', () => {
    render(<AISettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Response Behavior')).toBeInTheDocument()
  })

  it('renders Default Model Parameters section', () => {
    render(<AISettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Default Model Parameters')).toBeInTheDocument()
  })

  it('renders Agent Behavior section', () => {
    render(<AISettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Agent Behavior')).toBeInTheDocument()
  })

  it('renders Context & Memory section', () => {
    render(<AISettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Context & Memory')).toBeInTheDocument()
  })

  it('shows streaming switch as checked when streamingEnabled is true', () => {
    render(<AISettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const streamingSwitch = screen.getByRole('switch', { name: /streaming responses/i })
    expect(streamingSwitch).toHaveAttribute('data-state', 'checked')
  })

  it('shows streaming switch as unchecked when streamingEnabled is false', () => {
    render(<AISettings settings={{ ...defaultSettings, streamingEnabled: false }} onSettingsChange={vi.fn()} />)
    const streamingSwitch = screen.getByRole('switch', { name: /streaming responses/i })
    expect(streamingSwitch).toHaveAttribute('data-state', 'unchecked')
  })

  it('calls onSettingsChange with updated streamingEnabled when toggled', () => {
    const onChange = vi.fn()
    render(<AISettings settings={{ ...defaultSettings, streamingEnabled: false }} onSettingsChange={onChange} />)
    const streamingSwitch = screen.getByRole('switch', { name: /streaming responses/i })
    fireEvent.click(streamingSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ streamingEnabled: true }))
  })

  it('calls onSettingsChange with updated codeHighlighting when toggled', () => {
    const onChange = vi.fn()
    render(<AISettings settings={defaultSettings} onSettingsChange={onChange} />)
    const highlightSwitch = screen.getByRole('switch', { name: /code syntax highlighting/i })
    fireEvent.click(highlightSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ codeHighlighting: false }))
  })

  it('calls onSettingsChange with updated markdownEnabled when toggled', () => {
    const onChange = vi.fn()
    render(<AISettings settings={defaultSettings} onSettingsChange={onChange} />)
    const markdownSwitch = screen.getByRole('switch', { name: /markdown formatting/i })
    fireEvent.click(markdownSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ markdownEnabled: false }))
  })

  it('calls onSettingsChange with updated autoRunAgents when toggled', () => {
    const onChange = vi.fn()
    render(<AISettings settings={defaultSettings} onSettingsChange={onChange} />)
    const autoRunSwitch = screen.getByRole('switch', { name: /auto-run agents/i })
    fireEvent.click(autoRunSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ autoRunAgents: true }))
  })

  it('calls onSettingsChange with updated showAgentThinking when toggled', () => {
    const onChange = vi.fn()
    render(<AISettings settings={defaultSettings} onSettingsChange={onChange} />)
    const thinkingSwitch = screen.getByRole('switch', { name: /show agent thinking/i })
    fireEvent.click(thinkingSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showAgentThinking: false }))
  })

  it('calls onSettingsChange with updated useConversationContext when toggled', () => {
    const onChange = vi.fn()
    render(<AISettings settings={defaultSettings} onSettingsChange={onChange} />)
    const contextSwitch = screen.getByRole('switch', { name: /use conversation context/i })
    fireEvent.click(contextSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ useConversationContext: false }))
  })

  it('displays current temperature value', () => {
    render(<AISettings settings={{ ...defaultSettings, defaultTemperature: 0.7 }} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Current: 0.7')).toBeInTheDocument()
  })

  it('displays current max tokens value', () => {
    render(<AISettings settings={{ ...defaultSettings, defaultMaxTokens: 2000 }} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Current: 2000 tokens')).toBeInTheDocument()
  })

  it('agent timeout select can be opened', () => {
    render(<AISettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const trigger = screen.getByRole('combobox', { name: /agent execution timeout/i })
    expect(trigger).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.getByRole('option', { name: '30 seconds' })).toBeInTheDocument()
  })

  it('calls onSettingsChange with updated agentTimeout when Select changes', () => {
    const onChange = vi.fn()
    render(<AISettings settings={defaultSettings} onSettingsChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: /agent execution timeout/i })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: '5 minutes' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ agentTimeout: 300000 }))
  })

  it('context window size select can be opened', () => {
    render(<AISettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const trigger = screen.getByRole('combobox', { name: /context window size/i })
    expect(trigger).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.getByRole('option', { name: 'Last 5 messages' })).toBeInTheDocument()
  })

  it('calls onSettingsChange with updated contextWindowSize when Select changes', () => {
    const onChange = vi.fn()
    render(<AISettings settings={defaultSettings} onSettingsChange={onChange} />)
    const trigger = screen.getByRole('combobox', { name: /context window size/i })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: 'Last 50 messages' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ contextWindowSize: 50 }))
  })
})
