import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'

// Mock all lazy-loaded heavy components
vi.mock('@/components/settings/SettingsMenu', () => ({
  SettingsMenu: ({ open }: { open: boolean }) =>
    open ? <div data-testid="settings-menu">SettingsMenu</div> : null,
}))
vi.mock('@/components/notifications/OfflineIndicator', () => ({
  OfflineIndicator: () => null,
}))
vi.mock('@/components/notifications/ServiceWorkerUpdate', () => ({
  ServiceWorkerUpdate: () => null,
}))
vi.mock('@/components/notifications/InstallPrompt', () => ({
  InstallPrompt: () => null,
}))
vi.mock('@/components/PerformanceMonitor', () => ({
  PerformanceMonitor: () => null,
}))
vi.mock('@/components/cache/IndexedDBStatus', () => ({
  IndexedDBStatus: () => null,
}))
vi.mock('@/lib/analytics', () => ({
  analytics: {
    track: vi.fn(),
    trackEvent: vi.fn(),
    getMetrics: vi.fn().mockResolvedValue(null),
  },
  useAnalytics: vi.fn().mockReturnValue({
    events: [],
    sessions: [],
    clearData: vi.fn(),
    getMetrics: vi.fn().mockResolvedValue(null),
  }),
}))
vi.mock('@/hooks/use-auto-performance', () => ({
  useAutoPerformanceOptimization: () => ({
    isOptimizing: false,
  }),
}))
vi.mock('@/hooks/use-touch-gestures', () => ({
  // Arrow body must be parenthesized to return an object literal — `() => {}`
  // would return undefined and cause `swipeHandlers.onTouchStart` to throw.
  useSwipeGesture: () => ({ onTouchStart: vi.fn(), onTouchEnd: vi.fn() }),
}))
vi.mock('@/hooks/use-pull-to-refresh', () => ({
  usePullToRefresh: () => ({ isPulling: false, pullProgress: 0 }),
}))
vi.mock('@/hooks/use-indexeddb-cache', () => ({
  useIndexedDBCache: () => ({
    isInitialized: true,
    isSyncing: false,
    lastSyncTime: null,
    syncToCache: vi.fn(),
    getCacheStats: vi.fn().mockResolvedValue(null),
  }),
}))
vi.mock('@/hooks/use-dynamic-ui', () => ({
  useDynamicUI: () => ({
    config: {},
    layout: 'default',
    updateConfig: vi.fn(),
    suggestions: [],
  }),
}))
vi.mock('@/hooks/use-contextual-ui', () => ({
  useContextualUI: () => ({
    suggestions: [],
    recordUserAction: vi.fn(),
  }),
}))
vi.mock('@/hooks/use-tab-preloader', () => ({
  useTabPreloader: () => ({ preloadedTabs: new Set() }),
}))
vi.mock('@/hooks/use-data-prefetcher', () => ({
  useSmartPrefetch: () => ({
    prefetchedKeys: new Set(),
  }),
}))
vi.mock('@/components/ui/dynamic-ui-customizer', () => ({
  DynamicUICustomizer: () => null,
}))
vi.mock('@/components/ui/dynamic-ui-dashboard', () => ({
  DynamicUIDashboard: () => null,
}))
vi.mock('@/components/ui/contextual-suggestions', () => ({
  ContextualSuggestionsPanel: () => null,
}))
vi.mock('@/components/ui/smart-layout', () => ({
  // DynamicBackground wraps the entire app body — the mock must forward
  // children, otherwise nothing inside the page tree renders.
  DynamicBackground: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dynamic-background">{children}</div>
  ),
}))
vi.mock('@/lib/performance-profiles', () => ({
  defaultProfilesByTaskType: {},
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}))
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

import App from './App'

// App.tsx pulls in dozens of lazy-loaded components (AgentCard,
// AnalyticsDashboard, HuggingFaceModelBrowser, …) plus framer-motion. Each
// `render(<App />)` retains a large module + DOM graph which exhausts the
// jsdom worker heap when repeated across many `it()` blocks. To keep the
// suite lean, we render once per behavior cluster rather than once per
// assertion.
describe('App', () => {
  it('renders the main shell: tabs, default chat tab, and icon buttons', () => {
    render(<App />)
    expect(screen.getByRole('tab', { name: /chat/i })).toHaveAttribute(
      'data-state',
      'active',
    )
    expect(screen.getByRole('tab', { name: /agents/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /models/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /settings/i }),
    ).toBeInTheDocument()
    // Customize button (Palette icon) was given an explicit aria-label
    // so icon-only buttons are accessible.
    expect(
      screen.getByRole('button', { name: /customize/i }),
    ).toBeInTheDocument()
  })

  // NOTE: We deliberately do NOT click tabs or open dialogs here.
  // App.tsx is enormous (~1500 lines, dozens of useKV hooks, lazy panels,
  // framer-motion). Each interaction in jsdom triggers cascades of state
  // updates that exhaust the worker heap in CI even with the lazy panels
  // mocked out. Interaction behavior is covered by per-component tests
  // under src/components/{agent,models,analytics,settings}/.
})
