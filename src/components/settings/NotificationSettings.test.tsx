import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationSettings } from './NotificationSettings'
import type { AppSettings } from '@/lib/types'

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

describe('NotificationSettings', () => {
  it('renders Notification Settings heading', () => {
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Notification Settings')).toBeInTheDocument()
  })

  it('renders General Notifications section', () => {
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('General Notifications')).toBeInTheDocument()
  })

  it('renders Event Notifications section', () => {
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Event Notifications')).toBeInTheDocument()
  })

  it('renders Toast Notifications section', () => {
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Toast Notifications')).toBeInTheDocument()
  })

  it('shows notifications switch as checked when notificationsEnabled is true', () => {
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    const notifSwitch = screen.getByRole('switch', { name: /enable notifications/i })
    expect(notifSwitch).toHaveAttribute('data-state', 'checked')
  })

  it('calls onSettingsChange with updated notificationsEnabled when toggled', () => {
    const onChange = vi.fn()
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const notifSwitch = screen.getByRole('switch', { name: /enable notifications/i })
    fireEvent.click(notifSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ notificationsEnabled: false }))
  })

  it('shows notification sound switch when notificationsEnabled is true', () => {
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByRole('switch', { name: /notification sound/i })).toBeInTheDocument()
  })

  it('hides notification sound switch when notificationsEnabled is false', () => {
    render(<NotificationSettings settings={{ ...defaultSettings, notificationsEnabled: false }} onSettingsChange={vi.fn()} />)
    expect(screen.queryByRole('switch', { name: /notification sound/i })).not.toBeInTheDocument()
  })

  it('calls onSettingsChange with updated notificationSound when toggled', () => {
    const onChange = vi.fn()
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const soundSwitch = screen.getByRole('switch', { name: /notification sound/i })
    fireEvent.click(soundSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ notificationSound: false }))
  })

  it('calls onSettingsChange with updated notifyAgentComplete when toggled', () => {
    const onChange = vi.fn()
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const agentSwitch = screen.getByRole('switch', { name: /agent completion/i })
    fireEvent.click(agentSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ notifyAgentComplete: false }))
  })

  it('calls onSettingsChange with updated notifyErrors when toggled', () => {
    const onChange = vi.fn()
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const errorSwitch = screen.getByRole('switch', { name: /error notifications/i })
    fireEvent.click(errorSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ notifyErrors: false }))
  })

  it('calls onSettingsChange with updated notifyUpdates when toggled', () => {
    const onChange = vi.fn()
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const updatesSwitch = screen.getByRole('switch', { name: /app updates/i })
    fireEvent.click(updatesSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ notifyUpdates: false }))
  })

  it('calls onSettingsChange with updated showToast when toggled', () => {
    const onChange = vi.fn()
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const toastSwitch = screen.getByRole('switch', { name: /show toast messages/i })
    fireEvent.click(toastSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showToast: false }))
  })

  it('calls onSettingsChange with updated toastSuccess when toggled', () => {
    const onChange = vi.fn()
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const successSwitch = screen.getByRole('switch', { name: /success messages/i })
    fireEvent.click(successSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ toastSuccess: false }))
  })

  it('calls onSettingsChange with updated toastInfo when toggled', () => {
    const onChange = vi.fn()
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const infoSwitch = screen.getByRole('switch', { name: /info messages/i })
    fireEvent.click(infoSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ toastInfo: false }))
  })

  it('shows notifyModelLoaded switch', () => {
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByRole('switch', { name: /model loaded/i })).toBeInTheDocument()
  })

  it('calls onSettingsChange with updated notifyModelLoaded when toggled', () => {
    const onChange = vi.fn()
    render(<NotificationSettings settings={defaultSettings} onSettingsChange={onChange} />)
    const modelLoadedSwitch = screen.getByRole('switch', { name: /model loaded/i })
    fireEvent.click(modelLoadedSwitch)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ notifyModelLoaded: true }))
  })

  it('notifyModelLoaded switch shows as unchecked when false', () => {
    render(<NotificationSettings settings={{ ...defaultSettings, notifyModelLoaded: false }} onSettingsChange={vi.fn()} />)
    const modelLoadedSwitch = screen.getByRole('switch', { name: /model loaded/i })
    expect(modelLoadedSwitch).toHaveAttribute('data-state', 'unchecked')
  })
})
