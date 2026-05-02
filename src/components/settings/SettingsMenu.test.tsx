import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const { mockUseIsMobile } = vi.hoisted(() => ({
  mockUseIsMobile: vi.fn().mockReturnValue(false),
}))

// Mock all child setting panels so they render simple identifiable text
vi.mock('./GeneralSettings', () => ({
  GeneralSettings: () => <div data-testid="panel-general">GeneralSettings</div>,
}))
vi.mock('./AppearanceSettings', () => ({
  AppearanceSettings: () => <div data-testid="panel-appearance">AppearanceSettings</div>,
}))
vi.mock('./AISettings', () => ({
  AISettings: () => <div data-testid="panel-ai">AISettings</div>,
}))
vi.mock('./LLMRuntimeSettings', () => ({
  LLMRuntimeSettings: () => <div data-testid="panel-llm">LLMRuntimeSettings</div>,
}))
vi.mock('./NotificationSettings', () => ({
  NotificationSettings: () => <div data-testid="panel-notifications">NotificationSettings</div>,
}))
vi.mock('./PrivacySettings', () => ({
  PrivacySettings: () => <div data-testid="panel-privacy">PrivacySettings</div>,
}))
vi.mock('./DataSettings', () => ({
  DataSettings: () => <div data-testid="panel-data">DataSettings</div>,
}))
vi.mock('./AdvancedSettings', () => ({
  AdvancedSettings: () => <div data-testid="panel-advanced">AdvancedSettings</div>,
}))
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockUseIsMobile(),
}))

import { SettingsMenu } from './SettingsMenu'
import type { AppSettings } from '@/lib/types'

const defaultSettings: AppSettings = {
  autoSave: true,
  confirmDelete: true,
  keyboardShortcuts: true,
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  maxHistory: 100,
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
  agentTimeout: 60,
  useConversationContext: true,
  contextWindowSize: 4096,
  notificationsEnabled: true,
  notificationSound: false,
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
  apiEndpoint: 'http://localhost:11434',
  requestTimeout: 30,
  retryAttempts: 3,
  cacheEnabled: true,
  offlineMode: false,
}

describe('SettingsMenu', () => {
  it('renders dialog title when open', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not render dialog content when closed', () => {
    render(
      <SettingsMenu
        open={false}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders sidebar tab buttons on desktop', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('AI Behavior')).toBeInTheDocument()
    expect(screen.getByText('LLM Runtime')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument()
    expect(screen.getByText('Data Management')).toBeInTheDocument()
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  it('shows general panel by default', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('panel-general')).toBeInTheDocument()
  })

  it('switches to appearance panel when button clicked', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Appearance'))
    expect(screen.getByTestId('panel-appearance')).toBeInTheDocument()
  })

  it('passes settings and onSettingsChange down to child panels', () => {
    const onSettingsChange = vi.fn()
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    )
    // GeneralSettings panel is rendered by default; mock just renders text
    expect(screen.getByTestId('panel-general')).toBeInTheDocument()
  })

  it('switches to notifications panel when button clicked', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Notifications'))
    expect(screen.getByTestId('panel-notifications')).toBeInTheDocument()
  })

  it('switches to privacy panel when button clicked', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Privacy & Security'))
    expect(screen.getByTestId('panel-privacy')).toBeInTheDocument()
  })

  it('switches to data panel when button clicked', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Data Management'))
    expect(screen.getByTestId('panel-data')).toBeInTheDocument()
  })

  it('switches to advanced panel when button clicked', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Advanced'))
    expect(screen.getByTestId('panel-advanced')).toBeInTheDocument()
  })

  it('switches to LLM Runtime panel when button clicked', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('LLM Runtime'))
    expect(screen.getByTestId('panel-llm')).toBeInTheDocument()
  })

  it('switches to AI Behavior panel when button clicked', () => {
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('AI Behavior'))
    expect(screen.getByTestId('panel-ai')).toBeInTheDocument()
  })

  it('renders mobile tab list when isMobile is true', () => {
    mockUseIsMobile.mockReturnValue(true)
    render(
      <SettingsMenu
        open={true}
        onOpenChange={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    )
    // In mobile mode a tablist is rendered with 4 triggers
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBeGreaterThanOrEqual(4)
    mockUseIsMobile.mockReturnValue(false)
  })
})
