import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { mockUseDynamicUI, mockUseContextualUI } = vi.hoisted(() => ({
  mockUseDynamicUI: vi.fn(),
  mockUseContextualUI: vi.fn(),
}))

vi.mock('@/hooks/use-dynamic-ui', () => ({
  useDynamicUI: mockUseDynamicUI,
}))
vi.mock('@/hooks/use-contextual-ui', () => ({
  useContextualUI: mockUseContextualUI,
}))

import { DynamicUIDashboard } from './dynamic-ui-dashboard'

const basePreferences = {
  layoutDensity: 'comfortable' as const,
  colorScheme: 'default' as const,
  sidebarPosition: 'left' as const,
  chatBubbleStyle: 'rounded' as const,
  animationIntensity: 'normal' as const,
  fontSize: 'medium' as const,
  cardStyle: 'elevated' as const,
  accentColor: 'oklch(0.75 0.14 200)',
  backgroundPattern: 'dots' as const,
  autoAdaptLayout: true,
  smartSpacing: true,
  contextualColors: true,
}

const baseAdaptiveLayout = {
  columnCount: 3,
  cardSize: 'medium' as const,
  showSidebar: true,
  compactMode: false,
}

interface DynamicUIOverrides {
  preferences?: typeof basePreferences | null
  adaptiveLayout?: typeof baseAdaptiveLayout
  usage?: { mostUsedTabs: Record<string, number> } | undefined
}

function buildDynamicUI(overrides: DynamicUIOverrides = {}) {
  return {
    preferences: 'preferences' in overrides ? overrides.preferences : basePreferences,
    adaptiveLayout: overrides.adaptiveLayout ?? baseAdaptiveLayout,
    usage: 'usage' in overrides ? overrides.usage : { mostUsedTabs: { chat: 10, agents: 5, models: 2 } },
    getSpacingClass: () => '',
    getPaddingClass: () => '',
    getFontSizeClass: () => '',
    getCardStyleClasses: () => '',
    getAnimationClasses: () => '',
    trackTabUsage: vi.fn(),
    updatePreference: vi.fn(),
    setPreferences: vi.fn(),
  }
}

interface ContextualOverrides {
  behavior?: { sessionDuration: number[] } | null
  suggestions?: Array<{ id: string; type: string; title: string; description: string }>
  recommended?: string[]
}

function buildContextual(overrides: ContextualOverrides = {}) {
  return {
    behavior: 'behavior' in overrides ? overrides.behavior : { sessionDuration: [60_000, 120_000, 180_000] },
    suggestions: overrides.suggestions ?? [
      { id: 's1', type: 'tip', title: 'Try X', description: 'Useful tip' },
      { id: 's2', type: 'feature', title: 'Discover Y', description: 'Hidden gem' },
    ],
    getRecommendedFeatures: () => overrides.recommended ?? ['workflow', 'analytics'],
  }
}

describe('DynamicUIDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDynamicUI.mockReturnValue(buildDynamicUI())
    mockUseContextualUI.mockReturnValue(buildContextual())
  })

  it('returns null when preferences are missing', () => {
    mockUseDynamicUI.mockReturnValueOnce(buildDynamicUI({ preferences: null }))
    const { container } = render(<DynamicUIDashboard />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when behavior is missing', () => {
    mockUseContextualUI.mockReturnValueOnce(buildContextual({ behavior: null }))
    const { container } = render(<DynamicUIDashboard />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the dashboard heading and metric cards with derived values', () => {
    render(<DynamicUIDashboard />)
    expect(screen.getByText('Dynamic UI Dashboard')).toBeInTheDocument()
    expect(screen.getByText('3 Columns')).toBeInTheDocument()
    expect(screen.getByText('Comfortable Mode')).toBeInTheDocument()
    expect(screen.getByText(/3 sessions tracked/)).toBeInTheDocument()
  })

  it('renders most used features and smart suggestions', () => {
    render(<DynamicUIDashboard />)
    expect(screen.getByText('Most Used Features')).toBeInTheDocument()
    expect(screen.getByText('chat')).toBeInTheDocument()
    expect(screen.getByText('Smart Suggestions')).toBeInTheDocument()
    expect(screen.getByText('Try X')).toBeInTheDocument()
    expect(screen.getByText('Discover Y')).toBeInTheDocument()
  })

  it('renders the unexplored-features section when recommendations exist', () => {
    render(<DynamicUIDashboard />)
    expect(screen.getByText('Unexplored Features')).toBeInTheDocument()
    expect(screen.getByText('workflow')).toBeInTheDocument()
    expect(screen.getByText('analytics')).toBeInTheDocument()
  })

  it('hides the unexplored-features section when no recommendations', () => {
    mockUseContextualUI.mockReturnValue(buildContextual({ recommended: [] }))
    render(<DynamicUIDashboard />)
    expect(screen.queryByText('Unexplored Features')).not.toBeInTheDocument()
  })

  it('shows empty-state copy when no usage and no suggestions', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ usage: { mostUsedTabs: {} } }))
    mockUseContextualUI.mockReturnValue(
      buildContextual({ behavior: { sessionDuration: [] }, suggestions: [], recommended: [] }),
    )
    render(<DynamicUIDashboard />)
    expect(
      screen.getByText('Start using features to see your usage patterns'),
    ).toBeInTheDocument()
    expect(screen.getByText('No suggestions at the moment')).toBeInTheDocument()
  })

  it('renders Compact Mode label when adaptiveLayout.compactMode is true', () => {
    mockUseDynamicUI.mockReturnValue(
      buildDynamicUI({ adaptiveLayout: { ...baseAdaptiveLayout, compactMode: true } }),
    )
    render(<DynamicUIDashboard />)
    expect(screen.getByText('Compact Mode')).toBeInTheDocument()
  })

  it('shows Active badge when autoAdaptLayout is enabled', () => {
    render(<DynamicUIDashboard />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('shows Inactive badge when autoAdaptLayout is disabled', () => {
    mockUseDynamicUI.mockReturnValue(
      buildDynamicUI({ preferences: { ...basePreferences, autoAdaptLayout: false } }),
    )
    render(<DynamicUIDashboard />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
