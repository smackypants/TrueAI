import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppearanceSettings } from './AppearanceSettings'
import type { AppSettings } from '@/lib/types'

vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn((key, defaultVal) => [defaultVal, vi.fn()]),
}))

vi.mock('./ThemeSwitcher', () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher">ThemeSwitcher</div>,
}))

vi.mock('@/hooks/use-theme', () => ({
  useTheme: vi.fn(),
}))

import { useTheme } from '@/hooks/use-theme'

const mockUseTheme = useTheme as ReturnType<typeof vi.fn>

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

describe('AppearanceSettings', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: vi.fn(), resolvedTheme: 'dark' })
  })

  it('renders section heading', () => {
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByText('Appearance Settings')).toBeInTheDocument()
  })

  it('renders Colors & Themes tab', () => {
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /colors & themes/i })).toBeInTheDocument()
  })

  it('renders Display Settings tab', () => {
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /display settings/i })).toBeInTheDocument()
  })

  it('renders ThemeSwitcher in Colors & Themes tab by default', () => {
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    expect(screen.getByTestId('theme-switcher')).toBeInTheDocument()
  })

  it('switching to Display Settings tab shows theme mode section', async () => {
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    expect(screen.getByText('Theme Mode')).toBeInTheDocument()
  })

  it('Display Settings tab shows Light button', async () => {
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('clicking Light theme button calls setTheme with light', async () => {
    const setTheme = vi.fn()
    mockUseTheme.mockReturnValue({ theme: 'dark', setTheme, resolvedTheme: 'dark' })
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    await userEvent.click(screen.getByText('Light'))
    expect(setTheme).toHaveBeenCalledWith('light')
  })

  it('clicking Dark theme button calls setTheme with dark', async () => {
    const setTheme = vi.fn()
    mockUseTheme.mockReturnValue({ theme: 'light', setTheme, resolvedTheme: 'light' })
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    await userEvent.click(screen.getByText('Dark'))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('shows font size current value', async () => {
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    expect(screen.getByText('Current: 14px')).toBeInTheDocument()
  })

  it('shows animation speed current value when animations enabled', async () => {
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    expect(screen.getByText('Current: 1x')).toBeInTheDocument()
  })

  it('animation speed section hidden when animations disabled', async () => {
    render(<AppearanceSettings settings={{ ...defaultSettings, enableAnimations: false }} onSettingsChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    expect(screen.queryByText('Animation speed')).not.toBeInTheDocument()
  })

  it('calls onSettingsChange when showTimestamps toggled', async () => {
    const onChange = vi.fn()
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    const sw = screen.getByRole('switch', { name: /show timestamps/i })
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showTimestamps: false }))
  })

  it('calls onSettingsChange when showAvatars toggled', async () => {
    const onChange = vi.fn()
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    const sw = screen.getByRole('switch', { name: /show avatars/i })
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showAvatars: false }))
  })

  it('calls onSettingsChange when enableAnimations toggled', async () => {
    const onChange = vi.fn()
    render(<AppearanceSettings settings={defaultSettings} onSettingsChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: /display settings/i }))
    const sw = screen.getByRole('switch', { name: /enable animations/i })
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enableAnimations: false }))
  })
})
